import React from "react";

import { Input } from "../client/src/components/ui/input";

interface NumberInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "onChange"
> {
  value: string;
  onChange: (v: string) => void;
}

export default function NumberInput({
  value,
  onChange,
  ...rest
}: NumberInputProps) {
  return (
    <Input
      type="number"
      inputMode="decimal"
      step="0.1"
      min="0.1"
      className="text-right"
      value={value}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
        onChange(e.target.value)
      }
      {...rest}
    />
  );
}
