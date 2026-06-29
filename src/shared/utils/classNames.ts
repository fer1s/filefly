import { ClassNameValue } from "./types";

const appendClassName = (
  classNameValue: ClassNameValue,
  resolvedClassNames: string[],
) => {
  if (!classNameValue) return;

  if (Array.isArray(classNameValue)) {
    classNameValue.forEach((nestedClassNameValue) =>
      appendClassName(nestedClassNameValue, resolvedClassNames),
    );
    return;
  }

  if (typeof classNameValue !== "string") return;

  const normalizedClassName = classNameValue.trim();
  if (normalizedClassName) resolvedClassNames.push(normalizedClassName);
};

/**
 * Joins class names while ignoring falsy values and trimming whitespace.
 * @param classNamesList - Class names or nested class name arrays.
 * @returns Final normalized className string.
 */
export const classNames = (...classNamesList: ClassNameValue[]): string => {
  const resolvedClassNames: string[] = [];

  classNamesList.forEach((classNameValue) =>
    appendClassName(classNameValue, resolvedClassNames),
  );

  return resolvedClassNames.join(" ").trim();
};
