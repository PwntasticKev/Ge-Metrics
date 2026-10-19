const THREEJS_KEY = 'ge_metrics_threejs_chart'

export const isThreeJsChartEnabled = () => {
  try {
    return localStorage.getItem(THREEJS_KEY) === 'true'
  } catch {
    return false
  }
}

export const toggleThreeJsChart = () => {
  try {
    const current = localStorage.getItem(THREEJS_KEY) === 'true'
    localStorage.setItem(THREEJS_KEY, String(!current))
    window.location.reload()
  } catch {
    // localStorage unavailable
  }
}
