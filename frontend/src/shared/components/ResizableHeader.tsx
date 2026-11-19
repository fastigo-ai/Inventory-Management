import React from 'react';

interface ResizableThProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  id: string;
  width?: number;
  onResizeStart?: (e: React.MouseEvent, id: string, currentWidth?: number) => void;
  resizable?: boolean;
  children: React.ReactNode;
}

export const ResizableTh: React.FC<ResizableThProps> = ({
  id,
  width,
  onResizeStart,
  resizable = true,
  children,
  className = '',
  style = {},
  ...props
}) => {
  const mergedStyle: React.CSSProperties = {
    ...style,
    width: width ? `${width}px` : style.width,
    minWidth: width ? `${width}px` : style.minWidth,
    maxWidth: width ? `${width}px` : style.maxWidth,
  };

  return (
    <th
      className={`relative select-none ${className}`}
      style={mergedStyle}
      {...props}
    >
      <div className="overflow-hidden text-ellipsis whitespace-nowrap">
        {children}
      </div>
      {resizable && onResizeStart && (
        <div
          onMouseDown={(e) => onResizeStart(e, id, width)}
          className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-500/50 active:bg-blue-500 z-10 touch-none group-hover:bg-slate-300"
          title="Drag to resize column"
        />
      )}
    </th>
  );
};
