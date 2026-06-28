import type { ReactNode } from "react";

type PropertyRowProps = {
  label: string;
  value: ReactNode;
};

// One metadata row: a label and its value. Used throughout PropertiesContent.
const PropertyRow = ({ label, value }: PropertyRowProps) => (
  <div className="row">
    <span className="label">{label}</span>
    <span className="value">{value}</span>
  </div>
);

export default PropertyRow;
