// document.addEventListener("DOMContentLoaded", () => {
//     const map = L.map("Map").setView([52.6309, 1.2974], 12)

//     L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
//         attribution: "© OpenStreetMap contributors"
//     }).addTo(map)

//     let routeLine = null
//     let markers = []

//     async function geocode(query) {
//         const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`)
//         const data = await res.json()
//         return data.length ? [parseFloat(data[0].lat), parseFloat(data[0].lon)] : null
//     }

//     async function showRoute(startLocation, endLocation) {
//         const [startCoord, endCoord] = await Promise.all([geocode(startLocation), geocode(endLocation)])
//         if (!startCoord || !endCoord) return

//         markers.forEach(m => m.remove())
//         markers = []
//         if (routeLine) { routeLine.remove(); routeLine = null }

//         const startMarker = L.circleMarker(startCoord, { radius: 8, fillColor: "#8b2388", color: "#fff", weight: 2, fillOpacity: 1 }).addTo(map)
//         const endMarker = L.circleMarker(endCoord, { radius: 8, fillColor: "#ef4444", color: "#fff", weight: 2, fillOpacity: 1 }).addTo(map)
//         markers = [startMarker, endMarker]

//         routeLine = L.polyline([startCoord, endCoord], { color: "#8b2388", weight: 3, dashArray: "6 4" }).addTo(map)
//         map.fitBounds(routeLine.getBounds(), { padding: [40, 40] })
//     }

//     const cards = document.querySelectorAll(".route-card")

//     cards.forEach(card => {
//         card.addEventListener("click", () => {
//             cards.forEach(c => c.classList.remove("active"))
//             card.classList.add("active")
//             showRoute(card.dataset.start, card.dataset.end)
//         })
//     })

//     if (cards.length > 0) {
//         cards[0].classList.add("active")
//         showRoute(cards[0].dataset.start, cards[0].dataset.end)
//     }
// })

document.addEventListener("DOMContentLoaded", () => {

    const map = L.map("Map").setView([52.6309, 1.2974], 12)

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors",
        maxZoom: 19,
        referrerPolicy: "origin"
    }).addTo(map);

    L.control.zoom({ position: "topleft" }).addTo(map);

    let routeLayers = [];
    let selectedRide = null;

   function showRideOnMap(stops) {
        clearMap();
        
        const coords = stops.map(s => { return s.coords; });

        stops.forEach((stop, i) => {
            const isFirst = i === 0;
            const sz = isFirst ? 18 : 12;
            const state = isFirst ? "current" : "future";
            const icon = L.divIcon({
                className: "map-stop map-stop-" + state,
                iconSize: [sz, sz],
                iconAnchor: [sz / 2, sz / 2]
            });

            routeLayers.push(
                L.marker(stop.coords, { icon: icon })
                    .addTo(map)
                    .bindPopup("<strong>" + stop.name + "</strong><br>" + stop.time)
            );
        });

        map.fitBounds(L.latLngBounds(coords), { padding: [32, 32] });

        const waypoints = stops.map(s => { return s.coords[1] + "," + s.coords[0]; }).join(";");
        const osrmUrl = "https://router.project-osrm.org/route/v1/driving/" + waypoints + "?overview=full&geometries=geojson";

        fetch(osrmUrl)
            .then(res => { return res.json(); })
            .then(data => {
                const routeCoords = data.routes[0].geometry.coordinates.map(c => {
                    return [c[1], c[0]];
                });
                
                routeLayers.push(
                    L.polyline(routeCoords, { color: "rgba(230,232,245,0.25)", weight: 5, opacity: 1 }).addTo(map),
                    L.polyline(routeCoords, { color: "#00d2be", weight: 10, opacity: 0.65, dashArray: "8 6" }).addTo(map)
                );
            })
            .catch(() => {
                routeLayers.push(
                    L.polyline(coords, { color: "rgba(230,232,245,0.25)", weight: 5, opacity: 1 }).addTo(map),
                    L.polyline(coords, { color: "#00d2be", weight: 10, opacity: 0.65, dashArray: "8 6" }).addTo(map)
                );
            });
    }

    function renderStops(stops) {
        const list = document.getElementById("StopList");
        list.innerHTML = "";

        stops.forEach((stop, i) => {
            const isFirst = i === 0;
            const isLast = i === stops.length - 1;

            const item = document.createElement("div");
            item.className = "stop-item" +
                (isFirst ? " stop-current" : "") +
                (isLast ? " stop-terminus" : "");

            const dotClass = isFirst ? "stop-dot dot-current" : (isLast ? "stop-dot dot-terminus" : "stop-dot");
            const lineHtml = isLast ? "" : "<div class='stop-line'></div>";

            const badgeHtml = ""

            const timeHtml = (isFirst || isLast)
                ? "<div class='stop-time-row'><span class='stop-time" + (isFirst ? " time-current" : "") + "'>" + stop.time + "</span>" + badgeHtml + "</div>"
                : "<span class='stop-time'>" + stop.time + "</span>";

            item.innerHTML =
                "<div class='stop-connector'>" +
                    "<div class='" + dotClass + "'></div>" +
                    lineHtml +
                "</div>" +
                "<div class='stop-body'>" +
                    "<span class='stop-name'>" + stop.name + "</span>" +
                    timeHtml +
                "</div>";

            list.appendChild(item);
        });
    }

    function clearMap() {
        routeLayers.forEach(l => { map.removeLayer(l); });
        routeLayers = [];
    }

    document.querySelectorAll(".route-card").forEach((card, i) => {
        console.log(card, i)
        card.addEventListener("click", () => {
            const ride = routeData[i]
            console.log(ride)
            console.log(ride);

            const stops = [
                {
                    name: ride.start_placeName,
                    coords: [ride.start_latitude, ride.start_longitude],
                    time:"09:00"
                },
                {
                    name: ride.end_placeName,
                    coords: [ride.end_latitude, ride.end_longitude],
                    time:"09:30"
                }
            ];
            
            if (ride) showRideOnMap(stops);
        });
    })
})
