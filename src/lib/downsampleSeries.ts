// src/lib/downsampleSeries.ts
// Largest-Triangle-Three-Buckets (LTTB): dünnt eine Zeitreihe für Charts aus,
// ohne Hochs und Tiefs zu verlieren. Anders als "jeder n-te Punkt" wählt LTTB
// pro Bucket den Punkt, der die Kurvenform am stärksten prägt.
// Nur für die Darstellung — Kennzahlen immer auf der vollen Reihe rechnen.

export function downsampleLttb<T>(
  data: T[],
  maxPoints: number,
  getY: (point: T) => number
): T[] {
  if (maxPoints < 3 || data.length <= maxPoints) return data

  const sampled: T[] = [data[0]]
  // Erster und letzter Punkt sind fix, der Rest verteilt sich auf Buckets
  const bucketSize = (data.length - 2) / (maxPoints - 2)
  let prevIndex = 0

  for (let i = 0; i < maxPoints - 2; i++) {
    const bucketStart = Math.floor(i * bucketSize) + 1
    const bucketEnd = Math.min(Math.floor((i + 1) * bucketSize) + 1, data.length - 1)

    // Durchschnitt des nächsten Buckets als dritter Dreieckspunkt
    const nextStart = bucketEnd
    const nextEnd = Math.min(Math.floor((i + 2) * bucketSize) + 1, data.length)
    let avgX = 0
    let avgY = 0
    for (let j = nextStart; j < nextEnd; j++) {
      avgX += j
      avgY += getY(data[j])
    }
    const nextCount = nextEnd - nextStart
    avgX /= nextCount
    avgY /= nextCount

    const prevY = getY(data[prevIndex])
    let maxArea = -1
    let maxIndex = bucketStart
    for (let j = bucketStart; j < bucketEnd; j++) {
      const area = Math.abs(
        (prevIndex - avgX) * (getY(data[j]) - prevY) -
        (prevIndex - j) * (avgY - prevY)
      )
      if (area > maxArea) {
        maxArea = area
        maxIndex = j
      }
    }

    sampled.push(data[maxIndex])
    prevIndex = maxIndex
  }

  sampled.push(data[data.length - 1])
  return sampled
}
