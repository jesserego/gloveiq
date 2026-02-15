import React from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import UploadFileIcon from "@mui/icons-material/UploadFile";

type Props = {
  open: boolean;
  onClose: () => void;
  seedQuery: string;
  title?: string;
  confidence?: number;
  topMatch?: string;
  alternates?: string[];
};

export default function IQModeDrawer({
  open,
  onClose,
  seedQuery,
  title = "Identifier",
  confidence = 0.86,
  topMatch = "Rawlings Heart of the Hide PRO204",
  alternates = ["Wilson A2000 1786", "Mizuno Pro Select GPS1", "Rawlings Pro Preferred PROS15"],
}: Props) {
  const confidencePct = `${Math.round(confidence * 100)}%`;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <Box sx={{ p: 1.6 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>{title}</Typography>
          <Button onClick={onClose} startIcon={<CloseIcon />}>Close</Button>
        </Stack>
        <Divider sx={{ my: 1.2 }} />

        <Stack spacing={1.2}>
          <Box>
            <Typography variant="caption" color="text.secondary">Seed query</Typography>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {seedQuery?.trim() || "No seed query yet"}
            </Typography>
          </Box>

          <Box sx={{ p: 1.2, border: "1px solid", borderColor: "divider", borderRadius: 1.5 }}>
            <Typography variant="caption" color="text.secondary">Top match</Typography>
            <Typography variant="body1" sx={{ fontWeight: 800 }}>{topMatch}</Typography>
            <Stack direction="row" spacing={0.7} sx={{ mt: 0.8, flexWrap: "wrap" }}>
              <Chip size="small" color="primary" label={`Confidence ${confidencePct}`} />
              <Chip size="small" label="Variant Profile preview" />
            </Stack>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary">Alternates</Typography>
            <Stack spacing={0.6} sx={{ mt: 0.6 }}>
              {alternates.slice(0, 3).map((name) => (
                <Box key={name} sx={{ p: 0.9, border: "1px solid", borderColor: "divider", borderRadius: 1.2 }}>
                  <Typography variant="body2">{name}</Typography>
                </Box>
              ))}
            </Stack>
          </Box>

          <Stack direction="row" spacing={0.8}>
            <Button variant="contained" startIcon={<UploadFileIcon />}>
              Upload photos
            </Button>
            <Button variant="outlined">Run Identifier</Button>
          </Stack>
        </Stack>
      </Box>
    </Dialog>
  );
}
