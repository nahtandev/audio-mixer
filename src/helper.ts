import { accessSync } from "fs";

export function isAccessiblePathSync(path: string) {
  try {
    accessSync(path);
    return true;
  } catch {
    return false;
  }
}

import { isNotEmpty, isNumber, isString } from "class-validator";

export function toStringValue<T extends string>(val: any): T {
  if (!isNotEmpty(val)) {
    throw new Error("[formatter]: cannot format an empty value to string");
  }
  if (!isString(val)) throw new Error("[formatter]: value is not string");
  return val.toString() as T;
}

export function toStringOrUndefValue(val: any): string | undefined {
  if (!isNotEmpty(val)) return undefined; // consider a null value as undefined
  if (!isString(val)) throw new Error("[formatter]: value is not string");
  return val.toString();
}

export function toNumberValue(val: any): number {
  const parsedNumber = Number(val);
  if (!isNumber(parsedNumber)) {
    throw new Error("[formatter]: cannot format this value to number");
  }
  return parsedNumber;
}

export function toNumberOrUndefValue(val: any): number | undefined {
  if (!isNotEmpty(val)) return undefined; // consider a null value as undefined
  const parsedNumber = Number(val);
  if (!isNumber(parsedNumber)) {
    throw new Error("[formatter]: cannot format this value to number");
  }
  return parsedNumber;
}

export function toBoolValue(val: any): boolean {
  const strValue = toStringValue(val);
  if (val === true || strValue === "true") return true;
  if (val === false || strValue === "false") return false;
  throw new Error("[formatter]: cannot format this value to boolean");
}
