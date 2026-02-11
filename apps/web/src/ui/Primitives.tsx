import * as React from "react";
import { Card as MUICard, CardContent as MUICardContent, Button as MUIButton, TextField } from "@mui/material";
export function Card(props: React.ComponentProps<typeof MUICard>) { return <MUICard elevation={0} {...props} />; }
export function CardContent(props: React.ComponentProps<typeof MUICardContent>) { return <MUICardContent {...props} />; }
export function Button(props: React.ComponentProps<typeof MUIButton>) { return <MUIButton variant="contained" disableElevation {...props} />; }
export function Input(props: { value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string; "aria-label"?: string; }) {
  return <TextField value={props.value} onChange={props.onChange} placeholder={props.placeholder} aria-label={props["aria-label"]} fullWidth size="small" />;
}
