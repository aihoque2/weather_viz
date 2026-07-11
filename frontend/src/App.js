import logo from './weather_maps_logo.png';
import './App.css';
import ButtonMenu from './components/ButtonMenu';
import CityColorMap from './components/CityColorMap';
import TestHumidity from './components/TestComponent';

import { useEffect, useState } from 'react';

const MODE_TO_HASH = {
  start: '#/welcome',
  temperature: '#/temperature',
  wind_speed: '#/wind-speed',
  humidity: '#/humidity',
  test: '#/test',
};

const HASH_TO_MODE = {
  '#/welcome': 'start',
  '#/temperature': 'temperature',
  '#/wind-speed': 'wind_speed',
  '#/humidity': 'humidity',
  '#/test': 'test',
};

const getModeFromHash = () => HASH_TO_MODE[window.location.hash] || 'start';

function App() {
  // Starter, temperature, wind_speed, humidity, test
  const [mode, setMode] = useState(getModeFromHash());

  useEffect(() => {
    if (!window.location.hash) {
      window.location.hash = MODE_TO_HASH.start;
      return;
    }

    const onHashChange = () => setMode(getModeFromHash());
    window.addEventListener('hashchange', onHashChange);

    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigateMode = (nextMode) => {
    const nextHash = MODE_TO_HASH[nextMode] || MODE_TO_HASH.start;
    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash;
    }
  };

  const mapHandler = (event) => {
    console.log(event.target.dataset.name);
  };

  let graphic;

  console.log("mode: ", mode);
  if (mode === "start"){
    // Welcome screen
    
    graphic = (<>
    <p>Put some Weather data on this site or something idk</p>
    <img src={logo} className="App-logo" alt="logo" />
    </>);
  }else if (mode === "test"){
    graphic = <TestHumidity></TestHumidity>
  } 
  else{
    graphic = <CityColorMap mode={mode} onClick={mapHandler}/>;

  }

  return (
    <div className="App">
      <h1>
        <ButtonMenu setMode={navigateMode} mode={mode}></ButtonMenu>
      </h1>

        <div>
          {graphic}
        </div>

        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Git Gud
        </a>
    </div>
  );
}

export default App;
