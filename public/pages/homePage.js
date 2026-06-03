const LADYWOOD_COORDS = [52.482273, -1.90359];

document.addEventListener("DOMContentLoaded", () => {
    let map = L.map("RideMap", { zoomControl: false }).setView(LADYWOOD_COORDS, 12);
    
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors",
        maxZoom: 19,
        referrerPolicy: "origin"
    }).addTo(map);

    L.control.zoom({ position: "topleft" }).addTo(map);

    let routeLayers = [];
    let selectedRide = null;

    function clearMap() {
        routeLayers.forEach(l => { map.removeLayer(l); });
        routeLayers = [];
    }

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

    function showDetail(ride) {
        selectedRide = ride;
        document.getElementById("RideList").style.display = "none";
        document.getElementById("RideDetail").style.display = "flex";

        document.getElementById("DetailDriverName").textContent = ride.driver_name;
        document.getElementById("DetailDriverCar").textContent = `${ride.car_model} | ${ride.registration}`
        document.getElementById("DetailFrom").textContent = ride.start_location;
        document.getElementById("DetailTo").textContent = ride.end_location;
        document.getElementById("DetailTime").textContent = " Departs " + ride.start_time;
        document.getElementById("DetailSeats").textContent = " " + ride.seats_available +
            " seat" + (ride.seats_available === 1 ? "" : "s") + " available";

        const selectPickup = document.getElementById("RegisterPickup")
        const selectDropoff = document.getElementById("RegisterDropoff")

        selectPickup.innerHTML = ''
        selectDropoff.innerHTML = ''

        for (const stop of ride.stops) {
            const stopOpt = `<option>${stop.name}</option>`
            selectPickup.innerHTML += stopOpt
            selectDropoff.innerHTML += stopOpt
        }

        renderStops(ride.stops);
        showRideOnMap(ride.stops);
    }

    function showList() {
        selectedRide = null;
        document.getElementById("RideDetail").style.display = "none";
        document.getElementById("RideList").style.display = "flex";
        
        clearMap();
        map.setView(LADYWOOD_COORDS, 12);
    }

    const allCards = Array.from(document.querySelectorAll(".ride-card"));
    const searchInput = document.getElementById("RideSearchInput");
    const searchClear = document.getElementById("RideSearchClear");
    const listMeta = document.getElementById("RideListMeta");
    const noResults = document.getElementById("NoResults");

    function filterRides() {
        const q = searchInput.value.trim().toLowerCase();
        let visible = 0;

        allCards.forEach(card => {
            const match = !q || card.dataset.searchText.includes(q);
            card.style.display = match ? "" : "none";
            if (match) visible++;
        });

        searchClear.hidden = !q;
        noResults.hidden = visible > 0;
        listMeta.textContent = q
            ? visible + " of " + allCards.length + " matched"
            : allCards.length + " available";
    }

    searchInput.addEventListener("input", filterRides);

    searchClear.addEventListener("click", () => {
        searchInput.value = "";
        searchInput.focus();
        filterRides();
    });

    document.querySelectorAll(".ride-card").forEach(card => {
        card.addEventListener("click", () => {
            const id = parseInt(card.dataset.id);
            const ride = RIDESHARES.find(r => { return r.id === id; });
            if (ride) showDetail(ride);
        });
    });

    document.getElementById("BackToListBtn").addEventListener("click", showList);

    document.getElementById("RegisterBtn").addEventListener("click", () => {
        if (!selectedRide) return;

        // TOAST_MANAGER.notifyLarge(
        //     "All set!",
        //     "You\"ve joined " + selectedRide.driver_name + "\'s ride from " +
        //     selectedRide.start_location + " to " + selectedRide.end_location +
        //     ", departing at " + selectedRide.start_time + ".",
        //     6.0
        // );

        new Modal({
            type: "confirm",
            title: "Join this rideshare?",
            text: "_pickup_ -> _dropoff_"
        }).Show()
    });
});