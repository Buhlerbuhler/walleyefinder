const tempInput = document.getElementById('temp');
const goButton = document.getElementById('go');
const tempStatus = document.getElementById('temp-status');
const resultBlock = document.getElementById('result-area');
const depthOutput = document.getElementById('depth');
const lureOutput = document.getElementById('lure');
const whyOutput = document.getElementById('why');
const locationOutput = document.createElement('p');
locationOutput.classList.add('info');
resultBlock.appendChild(locationOutput);

// Winnipeg River upstream from Pointe du Bois
const LAT = 50.05;
const LON = -95.03;

// Convert wind direction in degrees to full words
function degreesToCompassFull(deg) {
  const directions = [
    "North", "Northeast", "East", "Southeast",
    "South", "Southwest", "West", "Northwest"
  ];
  const index = Math.round(deg / 45) % 8;
  return directions[index];
}

async function fetchWaterTemp() {
  try {
    const proxy = "https://corsproxy.io/?";
    const geoMetURL = "https://geo.weather.gc.ca/geomet?service=WFS&version=2.0.0&request=GetFeature&typeNames=MSC_BUOY_OBSERVATIONS&outputFormat=json";

    const resp = await fetch(proxy + geoMetURL);
    const data = await resp.json();

    const buoy = data.features.find(f => f.properties.station_id === "45140");

    if (buoy && buoy.properties.water_temperature !== null) {
      return buoy.properties.water_temperature;
    } else {
      return null;
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
  return speed < 5 ? 'Calm' : speed < 15 ? 'Moderate' : 'Strong';
}

function categorizeClouds(clouds) {
  return clouds < 30 ? 'Sunny' : 'Overcast';
}

function categorizeTime(hour) {
  if (hour >= 5 && hour < 11) return 'Morning';
  if (hour >= 11 && hour < 17) return 'Midday';
  if (hour >= 17 && hour < 21) return 'Evening';
  return 'Night';
}

function getDepth(temp, wind, time) {
  let d = temp < 16 ? '10–15 FT' :
          temp <= 18 ? '15–20 FT' :
          temp <= 21 ? '20–30 FT' : '25–35 FT (deeper)';
  if (wind === 'Moderate' && time !== 'Midday') d = temp <= 21 ? '15–25 FT' : d;
  return d;
}

function getLure(temp, wind, cloud, time) {
  if (temp < 16) return 'Slow jigs or live bait';
  if (temp <= 18) return wind === 'Moderate' ? 'Plastic jigs or spinners' : 'Jigs with plastics';
  if (temp <= 21) return cloud === 'Sunny' ? 'Swimbaits on drop-offs' : 'Crankbaits or swimbaits';
  return 'Deep-diving crankbaits or heavy jigs';
}

function getLocationTip(windCategory, windDirection) {
  if (windCategory === 'Calm') {
    return "Fish tight to structure with finesse techniques.";
  }
  if (windCategory === 'Moderate') {
    return `Target ${oppositeDirection(windDirection)}-facing shorelines where baitfish gather.`;
  }
  return "Focus on sheltered bays and the backside of points or islands.";
}

function oppositeDirection(direction) {
  const opposites = {
    "North": "South", "Northeast": "Southwest", "East": "West", "Southeast": "Northwest",
    "South": "North", "Southwest": "Northeast", "West": "East", "Northwest": "Southeast"
  };
  return opposites[direction] || direction;
}

async function autoFillTemp() {
  const fetchedTemp = await fetchWaterTemp();
  if (fetchedTemp !== null) {
    tempInput.value = fetchedTemp.toFixed(1);
    tempStatus.textContent = 'Auto water temp loaded';
  } else {
    tempInput.placeholder = "Enter manually…";
    tempStatus.textContent = 'Couldn’t fetch water temp – enter manually';
  }
}

goButton.addEventListener('click', async () => {
  let temp = parseFloat(tempInput.value);
  if (isNaN(temp)) {
    alert('Please enter a valid water temperature.');
    return;
  }

  const weather = await fetchWeather();
  const windSpeed = weather.windspeed;
  const windDirectionDeg = weather.winddirection;
  const windDirection = degreesToCompassFull(windDirectionDeg);
  const windCategory = categorizeWind(windSpeed);
  const cloud = categorizeClouds(weather.cloudcover ?? 50);
  const hour = new Date(weather.time).getHours();
  const time = categorizeTime(hour);

  const depth = getDepth(temp, windCategory, time);
  const lure = getLure(temp, windCategory, cloud, time);
  const locationTip = getLocationTip(windCategory, windDirection);

  depthOutput.textContent = `Depth: ${depth}`;
  lureOutput.textContent = `Lure: ${lure}`;
  whyOutput.textContent = `Conditions: ${windCategory} (${windDirection}) wind, ${cloud}, ${time}`;
  locationOutput.textContent = `Location Tip: ${locationTip}`;

  resultBlock.classList.remove('hidden');
});

autoFillTemp();
