import { Typography, Box } from '@mui/material';
import { Space } from '../theme/layout';

export function SearchPage() {
  return (
    <Box sx={{ px: Space.lg, py: Space.xl }}>
      <Typography variant="h6">搜索</Typography>
      <Typography variant="body2" color="text.secondary">
        直连搜索接入中
      </Typography>
    </Box>
  );
}
