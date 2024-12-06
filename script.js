const apiKey = "b671dae25e72a4bf88b92c31df2084cf";

// Fetch weather data using OpenWeatherMap API
async function fetchWeatherData(lat, lon) {
    try {
        const apiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
        console.log("Fetching data from URL:", apiUrl); // Log the API URL for debugging

        const response = await fetch(apiUrl);

        if (!response.ok) {
            console.error(`HTTP Error: ${response.status} - ${response.statusText}`);
            return;
        }

        const data = await response.json();
        console.log("API Response:", data); // Log the full response

        if (data.cod === 200) {
            // Extract and display weather data
            let rainfall = "No rain"; // Default message if no rain data is available
            if (data.rain) {
                if (data.rain["1h"]) {
                    rainfall = `${data.rain["1h"]} mm (last 1 hour)`;
                } else if (data.rain["3h"]) {
                    rainfall = `${data.rain["3h"]} mm (last 3 hours)`;
                }
            }

            document.getElementById("temperature").textContent = `${data.main.temp}°C`;
            document.getElementById("rainfall").textContent = rainfall;
            document.getElementById("wind-speed").textContent = `${data.wind.speed} m/s`;
            document.getElementById("location").textContent = data.name;

            // Trigger weather alerts if needed
            checkForAlerts(data);
            return data;
        } else {
            console.error("API Error:", data.message);
        }
    } catch (error) {
        console.error("Fetch error:", error);
    }
}

// Get user's location using Geolocation API
function getUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                console.log("User location:", { lat, lon });

                fetchWeatherData(lat, lon); // Fetch weather for user's location
                initializeMap(lat, lon); // Initialize map
            },
            (error) => {
                console.error("Geolocation error:", error.message);

                // Default to New York if geolocation fails
                const defaultLat = 40.7128;
                const defaultLon = -74.0060;
                console.log("Using default location:", { lat: defaultLat, lon: defaultLon });

                fetchWeatherData(defaultLat, defaultLon);
                initializeMap(defaultLat, defaultLon);
            }
        );
    } else {
        console.error("Geolocation not supported by this browser.");

        // Default to New York if geolocation is not supported
        const defaultLat = 40.7128;
        const defaultLon = -74.0060;
        fetchWeatherData(defaultLat, defaultLon);
        initializeMap(defaultLat, defaultLon);
    }
}

// Check for weather alerts and display them
function checkForAlerts(weatherData) {
    const alertsSection = document.getElementById("active-alerts");
    const alertSound = document.getElementById("alertSound");
    let alertTriggered = false;

    alertsSection.innerHTML = "<h2>Active Alerts</h2>"; // Clear previous alerts

    const windThreshold = 3; // Threshold for high wind alert
    const rainThreshold1h = 10; // Rain threshold for last 1 hour
    const rainThreshold3h = 20; // Rain threshold for last 3 hours
    const rainKeywords = ["heavy rain", "thunderstorm", "torrential rain"];

    // Wind alert
    if (weatherData.wind.speed > windThreshold) {
        alertTriggered = true;
        alertsSection.innerHTML += `
            <div class="alert">
                <p>⚠️ <strong>High Wind Speed Alert</strong></p>
                <p>Wind Speed: ${weatherData.wind.speed} m/s</p>
                <p>Severity: <span class="severe">Severe</span></p>
            </div>
        `;
    }

    // Rain alerts
    if (weatherData.rain) {
        if (weatherData.rain["1h"] > rainThreshold1h) {
            alertTriggered = true;
            alertsSection.innerHTML += `
                <div class="alert">
                    <p>⚠️ <strong>Heavy Rain Alert (Last 1 Hour)</strong></p>
                    <p>Rainfall: ${weatherData.rain["1h"]} mm</p>
                    <p>Severity: <span class="severe">Severe</span></p>
                </div>
            `;
        }
        if (weatherData.rain["3h"] > rainThreshold3h) {
            alertTriggered = true;
            alertsSection.innerHTML += `
                <div class="alert">
                    <p>⚠️ <strong>Heavy Rain Alert (Last 3 Hours)</strong></p>
                    <p>Rainfall: ${weatherData.rain["3h"]} mm</p>
                    <p>Severity: <span class="severe">Severe</span></p>
                </div>
            `;
        }
    }

    // Description-based rain alert
    if (rainKeywords.some((keyword) => weatherData.weather[0].description.toLowerCase().includes(keyword))) {
        alertTriggered = true;
        alertsSection.innerHTML += `
            <div class="alert">
                <p>⚠️ <strong>Heavy Rain Alert (Description)</strong></p>
                <p>Description: ${weatherData.weather[0].description}</p>
                <p>Severity: <span class="severe">Severe</span></p>
            </div>
        `;
    }

    // Default message if no alerts
    if (alertsSection.children.length === 1) {
        alertsSection.innerHTML += "<p>No active alerts at the moment. Stay safe!</p>";
    }

    // Play sound if an alert is triggered
    if (alertTriggered) {
        alertSound.play();
        showBrowserNotification("Severe Weather Alert!", "Check active alerts for details.");
    }
}

// Show browser notification
function showBrowserNotification(title, message) {
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, {
            body: message,
            icon: "alert_icon.png",
        });
    }
}

// Initialize Leaflet map
let map; // Declare globally
function initializeMap(lat, lon) {
    console.log("Initializing map at coordinates:", lat, lon);

    if (!map) {
        map = L.map("map").setView([lat, lon], 13);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "© OpenStreetMap contributors",
        }).addTo(map);
    } else {
        map.setView([lat, lon], 13);
    }

    // Add marker with weather data
    fetchWeatherData(lat, lon)
        .then((data) => {
            const weatherPopup = `
                <b>${data.name}</b><br>
                🌡️ Temperature: ${data.main.temp}°C<br>
                🌧️ Description: ${data.weather[0].description}<br>
                💨 Wind Speed: ${data.wind.speed} m/s
            `;
            L.marker([lat, lon]).addTo(map).bindPopup(weatherPopup).openPopup();
        })
        .catch((error) => {
            console.error("Failed to fetch weather data for the map marker:", error);
        });
}

// Request notification permission on page load
document.addEventListener("DOMContentLoaded", () => {
    if ("Notification" in window && Notification.permission !== "granted") {
        Notification.requestPermission();
    }
    getUserLocation(); // Initialize app
});

// Fetch weather data for a specific city
async function fetchWeatherByCity(city) {
    try {
        const apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${apiKey}`;
        console.log("Fetching weather for city:", city);

        const response = await fetch(apiUrl);

        if (!response.ok) {
            console.error(`HTTP Error: ${response.status} - ${response.statusText}`);
            alert("City not found. Please try again.");
            return;
        }

        const data = await response.json();
        console.log("API Response:", data);

        if (data.cod === 200) {
            // Update weather details
            let rainfall = "No rain";
            if (data.rain) {
                rainfall = data.rain["1h"]
                    ? `${data.rain["1h"]} mm (last 1 hour)`
                    : data.rain["3h"]
                    ? `${data.rain["3h"]} mm (last 3 hours)`
                    : "No data";
            }

            document.getElementById("temperature").textContent = `${data.main.temp}°C`;
            document.getElementById("rainfall").textContent = rainfall;
            document.getElementById("wind-speed").textContent = `${data.wind.speed} m/s`;
            document.getElementById("location").textContent = data.name;

            // Trigger weather alerts
            checkForAlerts(data);

            // Update map to the new location
            initializeMap(data.coord.lat, data.coord.lon);
        } else {
            console.error("API Error:", data.message);
        }
    } catch (error) {
        console.error("Fetch error:", error);
    }
}

// Add event listener for search button
document.getElementById("search-button").addEventListener("click", () => {
    const city = document.getElementById("search-input").value.trim();
    if (city) {
        fetchWeatherByCity(city);
    } else {
        alert("Please enter a city name.");
    }
});

// Modal elements
const subscribeModal = document.getElementById("subscribe-modal");
const reportModal = document.getElementById("report-modal");

const closeSubscribe = document.getElementById("close-subscribe");
const closeReport = document.getElementById("close-report");

const subscribeButton = document.getElementById("subscribe-alerts");
const reportButton = document.getElementById("report-issue");

// Open Modals
subscribeButton.addEventListener("click", () => {
    subscribeModal.style.display = "flex";
});

reportButton.addEventListener("click", () => {
    reportModal.style.display = "flex";
});

// Close Modals
closeSubscribe.addEventListener("click", () => {
    subscribeModal.style.display = "none";
});

closeReport.addEventListener("click", () => {
    reportModal.style.display = "none";
});

// Handle Subscription
document.getElementById("subscribe-submit").addEventListener("click", () => {
    const email = document.getElementById("subscribe-email").value;
    if (email) {
        alert(`Thank you for subscribing! Alerts will be sent to ${email}.`);
        console.log("Subscribed email:", email);
        subscribeModal.style.display = "none";
    } else {
        alert("Please enter a valid email address.");
    }
});

// Handle Issue Reporting
document.getElementById("report-submit").addEventListener("click", () => {
    const issue = document.getElementById("issue-description").value;
    if (issue) {
        alert("Thank you for your feedback. We'll look into it.");
        console.log("Reported issue:", issue);
        reportModal.style.display = "none";
    } else {
        alert("Please describe the issue.");
    }
});

// Close modals if clicking outside the content
window.addEventListener("click", (event) => {
    if (event.target === subscribeModal) {
        subscribeModal.style.display = "none";
    }
    if (event.target === reportModal) {
        reportModal.style.display = "none";
    }
});
