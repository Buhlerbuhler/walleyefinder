const tempInput = document.getElementById('temp');
const goButton = document.getElementById('go');
const tempStatus = document.getElementById('temp-status');
const resultBlock = document.getElementById('result-area');
const depthOutput = document.getElementById('depth');
const lureOutput = document.getElementById('lure');
const whyOutput = document.getElementById('why');

// Winnipeg River upstream from Pointe du Bois
const LAT = 50.05;
const LON = -95.03;

async function fetchWaterTemp() {
  try {
    // Use a free CORS proxy to bypass browser restrictions
    const proxy = "https://corsproxy.io/?";
    const geoMetURL = "https://geo.weather.gc.ca/geomet?service=WFS&version=2.0.0&request=GetFeature&typeNames=MSC_BUOY_OBSERVATIONS&outputFormat=json";

    const resp = await fetch(proxy + geoMetURL);
    const data = await resp.json();

    // Find the Lake Winnipeg South Basin buoy (station 45140)
    const buoy = data.features.find(f => f.properties.station_id === "45140");

    if (buoy && buoy.properties.water_temperature !== null) {
      return buoy.properties.water_temperature;
    } else {
      return null; // No water temp available
    }
  } catch (error) {
    console.error("Error fetching water temp:", error);
    return null;
  }
}

async function fetchWeather() {
  const resp = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current_weather=true&timezone=auto`);
  const data = await resp.json();
  return data.current_weather;
}

function categorizeWind(speed) {
  return speed < 5 ? 'calm' : speed < 15 ? 'moderate' : 'strong';
}

function categorizeClouds(clouds) {
  return clouds < 30 ? 'sunny' : 'overcast';
}

function categorizeTime(hour) {
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 17) return 'midday';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

function getDepth(temp, wind, time) {
  let d = temp < 16 ? '10–15 FT' :
          temp <= 18 ? '15–20 FT' :
          temp <= 21 ? '20–30 FT' : '25–35 FT (deeper)';
  if (wind === 'moderate' && time !== 'midday') d = temp <= 21 ? '15–25 FT' : d;
  return d;
}

function getLure(temp, wind, cloud, time) {
  if (temp < 16) return 'Slow jigs/live bait';
  if (temp <= 18) return wind === 'moderate' ? 'Plastic jigs/spinners' : 'Jigs with plastics';
  if (temp <= 21) return cloud === 'sunny' ? 'Swimbaits on drop-offs' : 'Crankbaits/swimbaits';
  return 'Deep-diving crankbaits or heavy jigs';
}

async function autoFillTemp() {
  const fetchedTemp = await fetchWaterTemp();
  if (fetchedTemp !== null) {
    tempInput.value = fetchedTemp.toFixed(1);
    tempStatus.textContent = '🌊 Auto water temp loaded';
  } else {
    tempInput.placeholder = "Enter manually…";
    tempStatus.textContent = '⚠️ Couldn’t fetch water temp – enter manually';
  }
}

goButton.addEventListener('click', async () => {
  let temp = parseFloat(tempInput.value);
  if (isNaN(temp)) {
    alert('Please enter a valid water temperature.');
    return;
  }

  const weather = await fetchWeather();
  const wind = categorizeWind(weather.windspeed);
  const cloud = categorizeClouds(weather.cloudcover ?? 50);
  const hour = new Date(weather.time).getHours();
  const time = categorizeTime(hour);

  const depth = getDepth(temp, wind, time);
  const lure = getLure(temp, wind, cloud, time);

  depthOutput.textContent = depth;
  lureOutput.textContent = lure;
  whyOutput.textContent = `Wind: ${wind}, Sun: ${cloud}, Time: ${time}`;

  resultBlock.classList.remove('hidden');
});

// Try to auto-fill temp on page load
autoFillTemp();
