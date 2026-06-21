import { classNames } from "@/shared/utils";

import "@/styles/components/IconButton.css";

import Button from "../Button";
import Icon from "../Icon";
import type { IconButtonProps } from "./types";

const IconButton = ({ icon, className, ...props }: IconButtonProps) => (
  <Button className={classNames("IconButton", className)} {...props}>
    <Icon icon={icon} />
  </Button>
);

export default IconButton;
