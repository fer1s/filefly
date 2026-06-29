import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { classNames } from "@/shared/utils";

import "@/styles/components/Icon.css";

import type { IconProps } from "./types";

const Icon = ({ className, ...props }: IconProps) => (
  <FontAwesomeIcon className={classNames("Icon", className)} {...props} />
);

export default Icon;
