document.addEventListener("DOMContentLoaded", () => {
    const map = L.map("Map").setView([52.6309, 1.2974], 12)

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors"
    }).addTo(map)

    let routeLine = null
    let markers = []

    async function geocode(query) {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`)
        const data = await res.json()
        return data.length ? [parseFloat(data[0].lat), parseFloat(data[0].lon)] : null
    }

    async function showRoute(startLocation, endLocation) {
        const [startCoord, endCoord] = await Promise.all([geocode(startLocation), geocode(endLocation)])
        if (!startCoord || !endCoord) return

        markers.forEach(m => m.remove())
        markers = []
        if (routeLine) { routeLine.remove(); routeLine = null }

        const startMarker = L.circleMarker(startCoord, { radius: 8, fillColor: "#8b2388", color: "#fff", weight: 2, fillOpacity: 1 }).addTo(map)
        const endMarker = L.circleMarker(endCoord, { radius: 8, fillColor: "#ef4444", color: "#fff", weight: 2, fillOpacity: 1 }).addTo(map)
        markers = [startMarker, endMarker]

        routeLine = L.polyline([startCoord, endCoord], { color: "#8b2388", weight: 3, dashArray: "6 4" }).addTo(map)
        map.fitBounds(routeLine.getBounds(), { padding: [40, 40] })
    }

    const cards = document.querySelectorAll(".route-card")

    cards.forEach(card => {
        card.addEventListener("click", () => {
            cards.forEach(c => c.classList.remove("active"))
            card.classList.add("active")
            showRoute(card.dataset.start, card.dataset.end)
        })
    })

    if (cards.length > 0) {
        cards[0].classList.add("active")
        showRoute(cards[0].dataset.start, cards[0].dataset.end)
    }
})
