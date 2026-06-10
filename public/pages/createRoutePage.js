document.addEventListener("DOMContentLoaded", () => {
    const map = L.map("Map").setView([52.4862, -1.8904], 12)

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors"
    }).addTo(map)

    let routeLine = null
    let markers = []

    const startInput = document.getElementById("StartLocation")
    const endInput = document.getElementById("EndLocation")
    const stopsInput = document.getElementById("Stops")

    async function geocode(query) {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`)
        const data = await res.json()
        return data.length ? [parseFloat(data[0].lat), parseFloat(data[0].lon)] : null
    }

    async function updateMap() {
        const startVal = startInput.value.trim()
        const endVal = endInput.value.trim()
        if (!startVal || !endVal) return

        const [startCoord, endCoord] = await Promise.all([geocode(startVal), geocode(endVal)])
        if (!startCoord || !endCoord) return

        const stopsRaw = stopsInput.value.split("\n").map(s => s.trim()).filter(Boolean)
        const stopCoords = await Promise.all(stopsRaw.map(geocode))
        const allCoords = [startCoord, ...stopCoords.filter(Boolean), endCoord]

        markers.forEach(m => m.remove())
        markers = []
        if (routeLine) { routeLine.remove(); routeLine = null }

        allCoords.forEach((coord, i) => {
            const color = i === 0 ? "#8b2388" : i === allCoords.length - 1 ? "#ef4444" : "#888"
            const marker = L.circleMarker(coord, { radius: 8, fillColor: color, color: "#fff", weight: 2, fillOpacity: 1 }).addTo(map)
            markers.push(marker)
        })

        routeLine = L.polyline(allCoords, { color: "#8b2388", weight: 3, dashArray: "6 4" }).addTo(map)
        map.fitBounds(routeLine.getBounds(), { padding: [30, 30] })
    }

    let debounceTimer
    function debounce(fn, delay) {
        clearTimeout(debounceTimer)
        debounceTimer = setTimeout(fn, delay)
    }

    startInput.addEventListener("input", () => debounce(updateMap, 800))
    endInput.addEventListener("input", () => debounce(updateMap, 800))
    stopsInput.addEventListener("input", () => debounce(updateMap, 1000))
})
