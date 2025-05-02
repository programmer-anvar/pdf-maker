import React, { useState, useRef } from "react";
import { DndContext, useDraggable, useDroppable } from "@dnd-kit/core";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const DraggableItem = ({ id, children }) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id });
  const style = {
    transform: transform
      ? `translate(${transform.x}px, ${transform.y}px)`
      : undefined,
    cursor: "grab",
    border: "1px dashed gray",
    padding: "8px",
    margin: "4px",
  };
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      {children}
    </div>
  );
};

const DropZone = ({ children, contentRef }) => {
  const { isOver, setNodeRef } = useDroppable({ id: "editor-zone" });
  const style = {
    minHeight: "800px",
    width: "100%",
    border: "2px dashed #ccc",
    padding: "20px",
    background: isOver ? "#f0f0f0" : "white",
  };
  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        contentRef.current = node;
      }}
      style={style}
    >
      {children}
    </div>
  );
};

const EditableElement = ({
  id,
  onRemove,
  position,
  onPositionChange,
  onSelect,
  fontSize,
  textAlign,
  onSizeChange,
  width,
  height,
  variant = "default",
}) => {
  const [content, setContent] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [elementWidth, setElementWidth] = useState(width || 60);
  const [elementHeight, setElementHeight] = useState(height || 20);
  const [elementPosition, setElementPosition] = useState(
    position || { x: 0, y: 0 }
  );
  const elementRef = useRef(null);
  const [isResizing, setIsResizing] = useState(false);

  // Update element size when props change
  React.useEffect(() => {
    if (width !== undefined && width !== elementWidth) {
      setElementWidth(width);
    }
    if (height !== undefined && height !== elementHeight) {
      setElementHeight(height);
    }
  }, [width, height]);

  // Update element position when props change
  React.useEffect(() => {
    if (position && (position.x !== elementPosition.x || position.y !== elementPosition.y)) {
      setElementPosition(position);
    }
  }, [position]);

  const updateSize = (newWidth, newHeight) => {
    setElementWidth(newWidth);
    setElementHeight(newHeight);
    onSizeChange?.(id, { width: newWidth, height: newHeight });
  };

  const updatePosition = (newX, newY) => {
    const newPosition = { x: newX, y: newY };
    setElementPosition(newPosition);
    onPositionChange?.(id, newPosition);
  };

  const handleMouseDown = (e) => {
    if (!isEditing && !isResizing) {
      e.stopPropagation();
      const startX = e.clientX;
      const startY = e.clientY;
      const startElementX = elementPosition.x;
      const startElementY = elementPosition.y;

      const handleMouseMove = (moveEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;
        const newPosition = {
          x: startElementX + deltaX,
          y: startElementY + deltaY,
        };
        setElementPosition(newPosition);
      };
      
      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        // Update the position in parent component
        onPositionChange?.(id, elementPosition);
      };
      
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }
  };

  const handleResizeMouseDown = (e) => {
    e.stopPropagation();
    setIsResizing(true);
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = elementWidth;
    const startHeight = elementHeight;
    const handleMouseMove = (moveEvent) => {
      const newWidth = Math.max(50, startWidth + moveEvent.clientX - startX);
      const newHeight = Math.max(5, startHeight + moveEvent.clientY - startY);
      updateSize(newWidth, newHeight);
    };
    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const getBorderStyle = () => {
    if (variant === "noborder") return "none";
    if (variant === "right-bottom") return undefined;
    return "1px solid black";
  };

  const extraBorders =
    variant === "right-bottom"
      ? {
          borderRight: "0.6px solid",
          borderBottom: "0.6px solid",
        }
      : {};

  return (
    <div
      ref={elementRef}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(id);
      }}
      style={{
        position: "absolute",
        left: `${elementPosition.x}px`,
        top: `${elementPosition.y}px`,
        cursor: isEditing ? "text" : "move",
      }}
    >
      <div
        style={{
          width: `${elementWidth}px`,
          height: `${elementHeight}px`,
          border: getBorderStyle(),
          position: "relative",
          // background: 'white',
          ...extraBorders,
        }}
        onMouseDown={handleMouseDown}
        onDoubleClick={() => setIsEditing(true)}
      >
        {isEditing ? (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onBlur={() => setIsEditing(false)}
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              resize: "none",
              fontSize: `${fontSize}px`,
              textAlign,
              outline: "none",
            }}
            autoFocus
          />
        ) : (
          <div
            style={{
              wordBreak: "break-word",
              fontSize: `${fontSize}px`,
              textAlign,
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent:
                textAlign === "center"
                  ? "center"
                  : textAlign === "right"
                  ? "flex-end"
                  : "flex-start",
              padding: "0 5px",
            }}
          >
            {content || ""}
          </div>
        )}
        <div
          onMouseDown={handleResizeMouseDown}
          style={{
            position: "absolute",
            bottom: "0",
            right: "0",
            width: "10px",
            height: "10px",
            cursor: "se-resize",
          }}
        />
      </div>
    </div>
  );
};

export default function DynamicPdfEditorWithPositionControls() {
  const [elements, setElements] = useState([]);
  const [textStyles, setTextStyles] = useState({});
  const [elementSizes, setElementSizes] = useState({});
  const [elementPositions, setElementPositions] = useState({});
  const [selectedElementId, setSelectedElementId] = useState(null);
  const contentRef = useRef();
  const [pdfOrientation, setPdfOrientation] = useState("portrait");

  const handleDragEnd = (event) => {
    if (event.over && event.over.id === "editor-zone") {
      const paper = contentRef.current.querySelector('[data-paper="true"]');
      const rect = paper.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width - 100, event.delta.x));
      const y = Math.max(0, Math.min(rect.height - 50, event.delta.y));
      const id = `${event.active.id}-${Date.now()}`;
      const position = { x, y };
      
      setElements([
        ...elements,
        { id, type: event.active.id, position }
      ]);
      
      setTextStyles((prev) => ({
        ...prev,
        [id]: { fontSize:8, textAlign: "center" },
      }));
      
      setElementSizes((prev) => ({ 
        ...prev, 
        [id]: { width: 60, height: 20 } 
      }));
      
      setElementPositions((prev) => ({
        ...prev,
        [id]: position
      }));
    }
  };

  const handlePositionChange = (id, position) => {
    setElementPositions((prev) => ({ ...prev, [id]: position }));
  };

  const handleSizeChange = (id, size) => {
    setElementSizes((prev) => ({ ...prev, [id]: size }));
  };

  const handleWidthChange = (e) => {
    const newWidth = parseInt(e.target.value);
    if (selectedElementId && !isNaN(newWidth)) {
      setElementSizes((prev) => ({
        ...prev,
        [selectedElementId]: {
          ...prev[selectedElementId],
          width: newWidth,
        },
      }));
    }
  };

  const handleHeightChange = (e) => {
    const newHeight = parseInt(e.target.value);
    if (selectedElementId && !isNaN(newHeight)) {
      setElementSizes((prev) => ({
        ...prev,
        [selectedElementId]: {
          ...prev[selectedElementId],
          height: newHeight,
        },
      }));
    }
  };

  const handleXPositionChange = (e) => {
    const newX = parseInt(e.target.value);
    if (selectedElementId && !isNaN(newX)) {
      setElementPositions((prev) => ({
        ...prev,
        [selectedElementId]: {
          ...prev[selectedElementId],
          x: newX,
        },
      }));
    }
  };

  const handleYPositionChange = (e) => {
    const newY = parseInt(e.target.value);
    if (selectedElementId && !isNaN(newY)) {
      setElementPositions((prev) => ({
        ...prev,
        [selectedElementId]: {
          ...prev[selectedElementId],
          y: newY,
        },
      }));
    }
  };

  const handleDownloadPdf = async () => {
    const paper = contentRef.current.querySelector('[data-paper="true"]');
    const canvas = await html2canvas(paper, {
      scale: 2,
      backgroundColor: "#fff",
    });
    const data = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: pdfOrientation,
      unit: "mm",
      format: "a4",
    });
    const imgProps = pdf.getImageProperties(data);
    const imgWidth = pdf.internal.pageSize.getWidth();
    const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
    pdf.addImage(data, "PNG", 0, 0, imgWidth, imgHeight);
    pdf.save("dynamic-editor.pdf");
  };

  const handleRemoveElement = () => {
    if (selectedElementId) {
      setElements(elements.filter(el => el.id !== selectedElementId));
      
      // Clean up associated styles and sizes
      const newTextStyles = { ...textStyles };
      delete newTextStyles[selectedElementId];
      setTextStyles(newTextStyles);
      
      const newElementSizes = { ...elementSizes };
      delete newElementSizes[selectedElementId];
      setElementSizes(newElementSizes);
      
      const newElementPositions = { ...elementPositions };
      delete newElementPositions[selectedElementId];
      setElementPositions(newElementPositions);
      
      setSelectedElementId(null);
    }
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div style={{ display: "flex", padding: 16 }}>
        <div style={{ width: "25%" }}>
          <h3>Elements</h3>
          <DraggableItem id="TextBox">Text Block (Default)</DraggableItem>
          <DraggableItem id="TextBox-noborder">
            Text Block (No Border)
          </DraggableItem>
          <DraggableItem id="TextBox-rightbottom">
            Text Block (Right + Bottom Border)
          </DraggableItem>

          {selectedElementId && (
            <div
              style={{
                marginTop: 16,
                border: "1px solid #eee",
                padding: "10px",
                borderRadius: "4px",
              }}
            >
              <h4>Element Controls</h4>

              <div style={{ marginBottom: "8px" }}>
                <label>
                  Font Size:
                  <input
                    type="number"
                    value={textStyles[selectedElementId]?.fontSize || 8}
                    onChange={(e) =>
                      setTextStyles((prev) => ({
                        ...prev,
                        [selectedElementId]: {
                          ...prev[selectedElementId],
                          fontSize: parseInt(e.target.value),
                        },
                      }))
                    }
                    style={{ width: "60px", marginLeft: "8px" }}
                  />
                </label>
              </div>

              <div style={{ marginBottom: "8px" }}>
                <label>
                  Align:
                  <select
                    value={textStyles[selectedElementId]?.textAlign || "center"}
                    onChange={(e) =>
                      setTextStyles((prev) => ({
                        ...prev,
                        [selectedElementId]: {
                          ...prev[selectedElementId],
                          textAlign: e.target.value,
                        },
                      }))
                    }
                    style={{ marginLeft: "8px" }}
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </label>
              </div>

              <div style={{ marginBottom: "8px" }}>
                <label>
                  Width:
                  <input
                    type="number"
                    value={elementSizes[selectedElementId]?.width || 60}
                    onChange={handleWidthChange}
                    style={{ width: "60px", marginLeft: "8px" }}
                  />
                </label>
              </div>

              <div style={{ marginBottom: "8px" }}>
                <label>
                  Height:
                  <input
                    type="number"
                    value={elementSizes[selectedElementId]?.height || 20}
                    onChange={handleHeightChange}
                    style={{ width: "60px", marginLeft: "8px" }}
                  />
                </label>
              </div>

              {/* Position controls added here */}
              <div style={{ marginBottom: "8px" }}>
                <label>
                  X Position:
                  <input
                    type="number"
                    value={elementPositions[selectedElementId]?.x || 0}
                    onChange={handleXPositionChange}
                    style={{ width: "60px", marginLeft: "8px" }}
                  />
                </label>
              </div>

              <div style={{ marginBottom: "8px" }}>
                <label>
                  Y Position:
                  <input
                    type="number"
                    value={elementPositions[selectedElementId]?.y || 0}
                    onChange={handleYPositionChange}
                    style={{ width: "60px", marginLeft: "8px" }}
                  />
                </label>
              </div>

              <div style={{ marginTop: "12px" }}>
                <button
                  onClick={handleRemoveElement}
                  style={{
                    padding: "6px 12px",
                    backgroundColor: "#f44336",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  Remove Element
                </button>
              </div>
            </div>
          )}

          <div style={{ marginTop: "16px" }}>
            <h4>PDF Options</h4>
            <label>
              Orientation:
              <select
                value={pdfOrientation}
                onChange={(e) => setPdfOrientation(e.target.value)}
                style={{ marginLeft: "8px" }}
              >
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </label>
          </div>
        </div>
        <div style={{ width: "75%" }}>
          <DropZone contentRef={contentRef}>
            <div
              data-paper="true"
              style={{
                position: "relative",
                width: pdfOrientation === "portrait" ? 595 : 842,
                height: pdfOrientation === "portrait" ? 842 : 595,
                background: "#fff",
                border: "1px solid #000",
              }}
              onClick={() => setSelectedElementId(null)}
            >
              {elements.map((el) => (
                <EditableElement
                  key={el.id}
                  id={el.id}
                  position={elementPositions[el.id] || el.position}
                  onPositionChange={handlePositionChange}
                  onSelect={setSelectedElementId}
                  onSizeChange={handleSizeChange}
                  fontSize={textStyles[el.id]?.fontSize || 8}
                  textAlign={textStyles[el.id]?.textAlign || "center"}
                  width={elementSizes[el.id]?.width || 60}
                  height={elementSizes[el.id]?.height || 20}
                  variant={
                    el.type === "TextBox-noborder"
                      ? "noborder"
                      : el.type === "TextBox-rightbottom"
                      ? "right-bottom"
                      : "default"
                  }
                />
              ))}
            </div>
          </DropZone>
          <div style={{ marginTop: "10px" }}>
            <button
              onClick={handleDownloadPdf}
              style={{
                padding: "8px 16px",
                backgroundColor: "#4CAF50",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Download PDF
            </button>
          </div>
        </div>
      </div>
    </DndContext>
  );
}