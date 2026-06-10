document.addEventListener("DOMContentLoaded", () => {
    const map = L.map("Map").setView([52.4862, -1.8904], 12)

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors"
    }).addTo(map)

    let routeLine = null
    let markers = []

    //const startInput = document.getElementById("StartLocation")
    //const endInput = document.getElementById("EndLocation")
    //const stopsInput = document.getElementById("Stops")

    const startSelect= document.getElementById("start");
    const endSelect= document.getElementById("end");
async function loadPlaces() {
    const res = await fetch("/auth/getPlaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
    });

    const places = await res.json();
    //console.log(places);
    

    places.forEach(i => {
        const make = i.placeName
        const option = document.createElement("option");
        option.value = make;
        option.textContent = make;
        startSelect.appendChild(option);
    });
}

loadPlaces();

startSelect.addEventListener("change", async() => {
    
    const start = startSelect.value;

    if (!start) return;
    endSelect.innerHTML = '<option value="">Select Nearest End Location</option>';

    const res = await fetch("/auth/getPlaces2", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({start})
        });

        const places2 = await res.json();
    
    
    places2.forEach(i => {
        const model = i.placeName
        const option = document.createElement("option");
        option.value = model;
        option.textContent = model;
        endSelect.appendChild(option);
    });
   
});


    async function geocode(query) {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`)
        const data = await res.json()
        return data.length ? [parseFloat(data[0].lat), parseFloat(data[0].lon)] : null
    }

    async function updateMap() {
        //const startVal = startInput.value.trim()
        //const endVal = endInput.value.trim()
        let place=startSelect.value;
        
        //if (!startVal || !endVal) return
        const res = await fetch("/auth/getCoords", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({place})
        });

        const response = await res.json();
        const startCoord=[response.latitude,response.longitude];
        console.log(startCoord);
        place = endSelect.value;
        const res2 = await fetch("/auth/getCoords", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({place})
        });
        const response2 = await res2.json();
        const endCoord=[response2.latitude,response2.longitude];
        console.log(endCoord);
        //const [startCoord, endCoord] = await Promise.all([geocode(startVal), geocode(endVal)])
        //if (!startCoord || !endCoord) return

       // const stopsRaw = stopsInput.value.split("\n").map(s => s.trim()).filter(Boolean)
        //const stopCoords = await Promise.all(stopsRaw.map(geocode))
        const allCoords = [startCoord, endCoord]

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
endSelect.addEventListener("change", () => debounce(updateMap, 800));
const form= document.getElementById("form");

form.addEventListener("submit", async (e) => {
        e.preventDefault()

        const submit = document.getElementById("submit")
        submit.disabled = true
        submit.value = "Registering..."
        const start = startSelect.value;
        const end = endSelect.value;
        console.log(start);
        console.log(end);
        const res = await fetch("/auth/addCommute", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({start, end})
        });
        
    console.log("status:", res.status);

    const text = await res.text();
    console.log("response:", text);
        //const data = await res.json()
            if (res.ok) {
                TOAST_MANAGER.notifySmall("Route registered!")
                setTimeout(() => { window.location.href = "/" }, 1500)
            } else {
                TOAST_MANAGER.notifySmall(data.message || "Registration failed.")
                submit.disabled = false
                submit.value = "Register route"
            }
        
})
        
    //startInput.addEventListener("input", () => debounce(updateMap, 800))
    //endInput.addEventListener("input", () => debounce(updateMap, 800))
    //stopsInput.addEventListener("input", () => debounce(updateMap, 1000))
})
