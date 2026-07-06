import { faSpinner } from "@fortawesome/free-solid-svg-icons";

import Icon from "@/shared/components/elements/Icon";

import "@/styles/components/Spinner.css";

const Spinner = () => {
  return <Icon className="loader" icon={faSpinner} spin />;
};

export default Spinner;
