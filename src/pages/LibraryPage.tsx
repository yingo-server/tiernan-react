import { Typography, Box } from '@mui/material';
import { Space } from '../theme/layout';

export function LibraryPage() {
  return (
    <Box sx={{ px: Space.lg, py: Space.xl }}>
      <Typography variant="h6">曲库</Typography>
      <Typography variant="body2" color="text.secondary">
        曲库接入中
      </Typography>
    </Box>
  );
}
