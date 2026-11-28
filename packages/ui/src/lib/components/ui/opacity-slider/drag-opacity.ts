export function dragOpacity(
  startY: number,
  y: number,
  track: Pick<DOMRect, 'top' | 'bottom'>,
  dragging: boolean
): number | undefined {
  if (!dragging) {
    const reachesTrack =
      Math.min(startY, y) <= track.bottom && Math.max(startY, y) >= track.top
    if (y === startY || !reachesTrack) return
  }

  const fraction = (track.bottom - y) / (track.bottom - track.top)
  return Math.round(Math.max(0, Math.min(1, fraction)) * 100) / 100
}
