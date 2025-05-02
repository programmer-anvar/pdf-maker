// Final version with Download PDF button and full sidebar controls
import React, { useState, useRef } from 'react';
import { DndContext, useDraggable, useDroppable } from '@dnd-kit/core';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// ... DraggableItem, DropZone, EditableElement (as you currently have it) ...

export default function DynamicPdfEditorWithTextControls() {
  const [elements, setElements] = useState([]);
  const [textStyles, setTextStyles] = useState({});
  const [elementSizes, setElementSizes] = useState({});
  const [selectedElementId, setSelectedElementId] = useState(null);
  const contentRef = useRef();
  const [pdfOrientation, setPdfOrientation] = useState('portrait');

  const handleDragEnd = (event) => {
    if (event.over && event.over.id === 'editor-zone') {
      const paper = contentRef.current.querySelector('[data-paper="true"]');
      const rect = paper.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width - 100, event.delta.x));
      const y = Math.max(0, Math.min(rect.height - 50, event.delta.y));
      const id = `${event.active.id}-${Date.now()}`;
      setElements([...elements, { id, type: event.active.id, position: { x, y } }]);
      setTextStyles((prev) => ({ ...prev, [id]: { fontSize: 16, textAlign: 'center' } }));
      setElementSizes((prev) => ({ ...prev, [id]: { width: 60, height: 20 } }));
    }
  };

  const handleSizeChange = (id, size) => {
    setElementSizes((prev) => ({ ...prev, [id]: size }));
  };

  const handleDownloadPdf = async () => {
    const paper = contentRef.current.querySelector('[data-paper="true"]');
    const canvas = await html2canvas(paper, { scale: 2, backgroundColor: '#fff' });
    const data = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: pdfOrientation, unit: 'mm', format: 'a4' });
    const imgProps = pdf.getImageProperties(data);
    const imgWidth = pdf.internal.pageSize.getWidth();
    const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
    pdf.addImage(data, 'PNG', 0, 0, imgWidth, imgHeight);
    pdf.save('dynamic-editor.pdf');
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div style={{ display: 'flex', padding: 16 }}>
        <div style={{ width: '25%' }}>
          <h3>Elements</h3>
          <DraggableItem id="TextBox">Text Block (Default)</DraggableItem>
          <DraggableItem id="TextBox-noborder">Text Block (No Border)</DraggableItem>
          <DraggableItem id="TextBox-rightbottom">Text Block (Right + Bottom Border)</DraggableItem>

          {selectedElementId && (
            <div style={{ marginTop: 16 }}>
              <label>Font Size:
                <input
                  type="number"
                  value={textStyles[selectedElementId]?.fontSize || 16}
                  onChange={(e) =>
                    setTextStyles((prev) => ({
                      ...prev,
                      [selectedElementId]: {
                        ...prev[selectedElementId],
                        fontSize: parseInt(e.target.value),
                      },
                    }))
                  }
                  style={{ width: '60px', marginLeft: '8px' }}
                />
              </label>

              <label style={{ marginLeft: '12px' }}>Align:
                <select
                  value={textStyles[selectedElementId]?.textAlign || 'center'}
                  onChange={(e) =>
                    setTextStyles((prev) => ({
                      ...prev,
                      [selectedElementId]: {
                        ...prev[selectedElementId],
                        textAlign: e.target.value,
                      },
                    }))
                  }
                  style={{ marginLeft: '8px' }}
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </label>

              <div style={{ marginTop: 12 }}>
                <label>Width:
                  <input
                    type="number"
                    value={elementSizes[selectedElementId]?.width || 60}
                    onChange={(e) =>
                      handleSizeChange(selectedElementId, {
                        width: parseInt(e.target.value),
                        height: elementSizes[selectedElementId]?.height || 20,
                      })
                    }
                    style={{ width: 60, marginLeft: 8 }}
                  />
                </label>
                <label style={{ marginLeft: 12 }}>Height:
                  <input
                    type="number"
                    value={elementSizes[selectedElementId]?.height || 20}
                    onChange={(e) =>
                      handleSizeChange(selectedElementId, {
                        width: elementSizes[selectedElementId]?.width || 60,
                        height: parseInt(e.target.value),
                      })
                    }
                    style={{ width: 60, marginLeft: 8 }}
                  />
                </label>
              </div>
            </div>
          )}
        </div>

        <div style={{ width: '75%' }}>
          <DropZone contentRef={contentRef}>
            <div data-paper="true" style={{ position: 'relative', width: 595, height: 842, background: '#fff', border: '1px solid #000' }}>
              {elements.map((el) => (
                <EditableElement
                  key={el.id}
                  id={el.id}
                  position={el.position}
                  onSelect={setSelectedElementId}
                  onSizeChange={handleSizeChange}
                  fontSize={textStyles[el.id]?.fontSize || 16}
                  textAlign={textStyles[el.id]?.textAlign || 'center'}
                  variant={el.type === 'TextBox-noborder' ? 'noborder' : el.type === 'TextBox-rightbottom' ? 'right-bottom' : 'default'}
                  widthProp={elementSizes[el.id]?.width}
                  heightProp={elementSizes[el.id]?.height}
                />
              ))}
            </div>
          </DropZone>

          <div style={{ textAlign: 'right', marginTop: 16 }}>
            <button onClick={handleDownloadPdf}>Download PDF</button>
          </div>
        </div>
      </div>
    </DndContext>
  );
}
