
export type DiffResult = {
  type: 'added' | 'removed' | 'common';
  value: string;
  lineNumber?: number;
};

// A simple implementation of Myers diff algorithm for line-based comparison.
export function diffLines(oldStr: string, newStr: string): DiffResult[] {
  const oldLines = oldStr.split('\n');
  const newLines = newStr.split('\n');
  const N = oldLines.length;
  const M = newLines.length;
  const max = N + M;
  const v = new Array(2 * max + 1);
  const trace = [];
  
  v[max + 1] = 0;

  for (let d = 0; d <= max; d++) {
    trace.push([...v]);
    for (let k = -d; k <= d; k += 2) {
      let x;
      const K = max + k;
      if (k === -d || (k !== d && v[K - 1] < v[K + 1])) {
        x = v[K + 1];
      } else {
        x = v[K - 1] + 1;
      }
      let y = x - k;
      while (x < N && y < M && oldLines[x] === newLines[y]) {
        x++;
        y++;
      }
      v[K] = x;
      if (x >= N && y >= M) {
        // Found shortest path
        const result: DiffResult[] = [];
        let px = N, py = M;
        for (let i = trace.length - 1; i >= 0; i--) {
            const pv = trace[i];
            const pK = max + (px - py);
            let prevX;
            if (px - py === -i || (px - py !== i && pv[pK - 1] < pv[pK + 1])) {
                prevX = pv[pK + 1];
            } else {
                prevX = pv[pK - 1] + 1;
            }
            let prevY = prevX - (px - py);

            while (px > prevX && py > prevY) {
                result.unshift({ type: 'common', value: oldLines[px - 1], lineNumber: py });
                px--;
                py--;
            }

            if (i > 0) {
                 if (prevX < px) {
                    result.unshift({ type: 'removed', value: oldLines[px - 1] });
                 } else {
                    result.unshift({ type: 'added', value: newLines[py - 1], lineNumber: py });
                 }
            }
            px = prevX;
            py = prevY;
        }
        return result;
      }
    }
  }
  return []; // Should not be reached
}
