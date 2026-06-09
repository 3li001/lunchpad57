document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector("#RegisterDriverForm")
    if (!form) return
/*
    const models = {
    Toyota: ["Yaris", "Example1", "Example2"],
    Volkswagon: ["Golf", "Example3", "example 4"]
    };
    const years={
    Yaris: [2012,2013,2014],
    Golf: [2016,2034,3412]
    };
*/





const makeSelect = document.getElementById("make");
const modelSelect = document.getElementById("model");
const yearSelect= document.getElementById("year");
async function loadMakes() {
    const res = await fetch("/auth/getVehicleMakes", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
    });

    const makes = await res.json();
    console.log(makes);
    makeSelect.innerHTML = '<option value="">Select a make</option>';

    makes.forEach(i => {
        const make = i.vehicleMake
        const option = document.createElement("option");
        option.value = make;
        option.textContent = make;
        makeSelect.appendChild(option);
    });
}

loadMakes();

makeSelect.addEventListener("change", async() => {
    
    const make = makeSelect.value;

    if (!make) return;
    modelSelect.innerHTML = '<option value="">Select a model</option>';
/*
    if (!models[make]) return;

    models[make].forEach(model => {
        const option = document.createElement("option");
        option.value = model;
        option.textContent = model;
        modelSelect.appendChild(option);
    });
    */
   
    const res = await fetch("/auth/getVehicleModels", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ make })
        });

        const models = await res.json();
    
    
    models.forEach(i => {
        const model = i.vehicleModel
        const option = document.createElement("option");
        option.value = model;
        option.textContent = model;
        modelSelect.appendChild(option);
    });
   
});

modelSelect.addEventListener("change", async () => {
    
        const model = modelSelect.value;

        yearSelect.innerHTML = '<option value="">Select a year</option>';
    /*
        if (!years[model]) return;

        years[model].forEach(year => {
            const option = document.createElement("option");
            option.value = year;
            option.textContent = year;
            yearSelect.appendChild(option);
        });
        */
    
    const res = await fetch("/auth/getVehicleYears", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model })
        });

        const years = await res.json();
    

        years.forEach(i => {
            const year = i.vehicleYear;
            const option = document.createElement("option");
            option.value = year;
            option.textContent = year;
            yearSelect.appendChild(option);
        });
   
});


    form.addEventListener("submit", async (e) => {
        e.preventDefault()

        const submit = form.querySelector("input[type='submit']")
        submit.disabled = true
        submit.value = "Registering..."

        const body2 = {
            make: form.make.value,
            model: form.model.value,
            year: form.year.value,
            numberPlate: form.numberPlate.value
        }
        //var modelData = document.getElementById("make");
        const body={
            make: makeSelect.value,
            model: modelSelect.value,
            year: yearSelect.value,
            numberPlate: form.numberPlate.value.trim()
        }
        var makeData = makeSelect.value;
        var modelData = modelSelect.value;
        var yearData = yearSelect.value;
        console.log(makeData);
        console.log(modelData);
        console.log(yearData);
        console.log(body);
        //var text = modelData.options[modelData.selectedIndex].text;
        //console.log(value);
        try {
            const res = await fetch("/auth/addDriver", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            })

            const data = await res.json()
            if (res.ok) {
                TOAST_MANAGER.notifySmall("You're now registered as a driver!")
                setTimeout(() => { window.location.href = "/" }, 1500)
            } else {
                TOAST_MANAGER.notifySmall(data.message || "Registration failed.")
                submit.disabled = false
                submit.value = "Register as Driver"
            }
        } catch {
            TOAST_MANAGER.notifySmall("Connection failed, please try again.")
            submit.disabled = false
            submit.value = "Register as Driver"
        }
    })
})
