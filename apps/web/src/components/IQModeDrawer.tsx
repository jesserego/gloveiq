import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  Divider,
  LinearProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import { api } from "../lib/api";

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
  const [files, setFiles] = useState<File[]>([]);
  const [hint, setHint] = useState(seedQuery || "");
  const [uploading, setUploading] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipts, setReceipts] = useState<Array<{ name: string; photoId: string; deduped: boolean }>>([]);
  const [result, setResult] = useState<{
    topMatch: string;
    confidence: number;
    alternates: string[];
  } | null>(null);

  const activeTopMatch = result?.topMatch || topMatch;
  const activeConfidence = result?.confidence ?? confidence;
  const activeAlternates = result?.alternates?.length ? result.alternates : alternates;
  const confidencePct = `${Math.round(activeConfidence * 100)}%`;
  const canRun = files.length > 0 && !uploading && !running;
  const canUpload = files.length > 0 && !uploading && !running;
  const fileLabel = useMemo(() => {
    if (!files.length) return "No images selected";
    if (files.length === 1) return files[0].name;
    return `${files.length} images selected`;
  }, [files]);

  useEffect(() => {
    if (!open) return;
    setHint(seedQuery || "");
  }, [open, seedQuery]);

  async function runUpload() {
    if (!files.length) {
      setError("Select at least one photo before upload.");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const out = await Promise.all(
        files.map(async (file) => {
          const u = await api.uploadPhoto(file);
          return { name: file.name, photoId: u.photo_id, deduped: u.deduped };
        }),
      );
      setReceipts(out);
    } catch {
      setError("Upload failed. Check API connectivity and try again.");
    } finally {
      setUploading(false);
    }
  }

  async function runIdentifier() {
    if (!files.length) {
      setError("Add photos first, then run identifier.");
      return;
    }
    setError(null);
    setRunning(true);
    try {
      const out = await api.appraisalAnalyze(files, hint || seedQuery);
      const identify = out.stages?.identify || {};
      const appraisal = out.appraisal || {};
      const nextTop =
        String(identify?.winner?.display_name || identify?.topMatch || appraisal?.lineage?.display_name || activeTopMatch);
      const nextConfidence = Number(identify?.winner?.score ?? appraisal?.confidence ?? activeConfidence) || activeConfidence;
      const nextAlts = Array.isArray(identify?.alternates)
        ? identify.alternates.map((a: any) => String(a?.display_name || a?.name || "")).filter(Boolean).slice(0, 3)
        : activeAlternates;
      setResult({
        topMatch: nextTop,
        confidence: Math.max(0, Math.min(1, nextConfidence)),
        alternates: nextAlts,
      });
      if (Array.isArray(out.uploads) && out.uploads.length) {
        setReceipts(out.uploads.map((u) => ({ name: u.name, photoId: u.photoId, deduped: u.deduped })));
      }
    } catch {
      setError("Identifier run failed. Ensure API is running and try again.");
    } finally {
      setRunning(false);
    }
  }

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

          <TextField
            size="small"
            label="Identifier hint"
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            placeholder="Brand / model / pattern (optional)"
          />

          <Box sx={{ p: 1.2, border: "1px solid", borderColor: "divider", borderRadius: 1.5 }}>
            <Typography variant="caption" color="text.secondary">Top match</Typography>
            <Typography variant="body1" sx={{ fontWeight: 800 }}>{activeTopMatch}</Typography>
            <Stack direction="row" spacing={0.7} sx={{ mt: 0.8, flexWrap: "wrap" }}>
              <Chip size="small" color="primary" label={`Confidence ${confidencePct}`} />
              <Chip size="small" label="Variant Profile preview" />
            </Stack>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary">Alternates</Typography>
            <Stack spacing={0.6} sx={{ mt: 0.6 }}>
              {activeAlternates.slice(0, 3).map((name) => (
                <Box key={name} sx={{ p: 0.9, border: "1px solid", borderColor: "divider", borderRadius: 1.2 }}>
                  <Typography variant="body2">{name}</Typography>
                </Box>
              ))}
            </Stack>
          </Box>

          <input
            id="iq-mode-upload-input"
            hidden
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => {
              const next = Array.from(e.target.files || []);
              setFiles(next);
              setError(null);
            }}
          />
          <Box sx={{ p: 1, border: "1px dashed", borderColor: "divider", borderRadius: 1.2 }}>
            <Typography variant="caption" color="text.secondary">{fileLabel}</Typography>
            {receipts.length ? (
              <Stack spacing={0.45} sx={{ mt: 0.6 }}>
                {receipts.slice(0, 4).map((row) => (
                  <Typography key={`${row.name}_${row.photoId}`} variant="caption" color="text.secondary">
                    {row.name} • {row.photoId} • {row.deduped ? "deduped" : "uploaded"}
                  </Typography>
                ))}
              </Stack>
            ) : null}
          </Box>

          {uploading || running ? <LinearProgress /> : null}
          {error ? <Alert severity="warning">{error}</Alert> : null}

          <Stack direction="row" spacing={0.8}>
            <Button
              variant="contained"
              startIcon={<UploadFileIcon />}
              onClick={() => document.getElementById("iq-mode-upload-input")?.click()}
            >
              Upload photos
            </Button>
            <Button
              variant="outlined"
              startIcon={<PlayArrowRoundedIcon />}
              onClick={runUpload}
              disabled={!canUpload}
            >
              Save Upload
            </Button>
            <Button
              variant="outlined"
              onClick={runIdentifier}
              disabled={!canRun}
            >
              Run Identifier
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Dialog>
  );
}
