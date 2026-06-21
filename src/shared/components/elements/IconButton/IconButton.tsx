import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { classNames } from "@/shared/utils";

import "@/styles/components/IconButton.css";

import Button from "../Button";
import type { IconButtonProps } from "./types";

const IconButton = ({ icon, className, ...props }: IconButtonProps) => (
  <Button className={classNames("IconButton", className)} {...props}>
    <FontAwesomeIcon icon={icon} />
  </Button>
);

export default IconButton;
