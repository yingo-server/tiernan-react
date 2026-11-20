import { Typography, Box } from '@mui/material';
import { Space } from '../theme/layout';

export function SettingsPage() {
  return (
    <Box sx={{ px: Space.lg, py: Space.xl }}>
      <Typography variant="h6">设置</Typography>
      <Typography variant="body2" color="text.secondary">
        设置项接入中
      </Typography>
    </Box>
  );
}
