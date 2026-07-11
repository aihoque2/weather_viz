import React, { useState, useEffect } from "react";
import USAMap from "react-usa-map";
import USStateToolTip from "./USStateToolTip.js";
import { useApolloClient, useLazyQuery } from "@apollo/client";
import "./CityColorMap.css"
import us_state_to_abbrev from "../extras/NameToAbbv.js"
import us_state_to_name from "../extras/StateToName.js"
import cities_data from "../extras/Cities.js";

import { GET_AVG_HUMIDITY_BY_STATE, 
    GET_AVG_TEMPERATURE_BY_STATE, 
    GET_AVG_WIND_SPEED_BY_STATE,
    GET_HUMIDITY_BY_CITY_STATE,
    GET_TEMPERATURE_BY_CITY_STATE,
    GET_WIND_SPEED_BY_CITY_STATE
} from "../db/queries.js"; // Import the query

import Legend from "./Legend.js"
     
const get_full_name = (mode) => {

        /*
        present whether data is Humidity,
        Wind Speed, or Temperature. 
        */
        if (mode === "humidity"){return "Humidity" }
       else if (mode === "wind_speed"){return "Wind Speed"}
       else if (mode === "temperature"){return "Temperature"}
       else return ""
}

const interpolateColor = (ratio, r1, g1, b1, r2, g2, b2) => {
    /*
        // Temperature: Blue (cold) → Red (hot) YES AI HELPED ME. HOW ELSE DO YOU DO JS
        // Wind Speed: Light Gray (calm) → Orange (intense)
        // Desert sand/gold brown (dry) → Green (humid)
    */
    const r = Math.round(r1 + ratio * (r2 - r1));
    const g = Math.round(g1 + ratio * (g2 - g1));
    const b = Math.round(b1 + ratio * (b2 - b1));

    // convert to hex in case USAMap doesn't accept rgb()
    const toHex = (val) => val.toString(16).padStart(2, '0');
    
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const CityColorMap = (props) => {
    const mode = props.mode
    const client = useApolloClient();
    let full_name = get_full_name(mode)

    const [statesCustomConfig, setStatesCustomConfig] = useState({});
    const [toolTipOpened, SetToolTipOpened] = useState(true);
    const [selectedUSState, setSelectedUSState] = useState(null);
    const [citiesData, setCitiesData] = useState(null);
    const [clickLoc, setClickLoc] = useState({}); // state location: x and y
    const [loading, setLoading] = useState(true);
    const [stateAverages, setStateAverages] = useState({});

    // min/max values of the weather color wheel
    const [minVal, setMinVal] = useState(0);  
    const [maxVal, setMaxVal] = useState(0);  

    // pick the right query and field names based on mode
    const getQueryConfig = () => {
        if (mode === "temperature") return { 
            query: GET_AVG_TEMPERATURE_BY_STATE, 
            resolverName: "getAvgTemperatureByState", 
            fieldName: "temperature" 
        };
        if (mode === "humidity") return { 
            query: GET_AVG_HUMIDITY_BY_STATE, 
            resolverName: "getAvgHumidityByState", 
            fieldName: "humidity" 
        };
        if (mode === "wind_speed") return { 
            query: GET_AVG_WIND_SPEED_BY_STATE, 
            resolverName: "getAvgWindSpeedByState", 
            fieldName: "wind_speed" 
        };
    }

    const [fetchTemperature, { data: tempData }] = useLazyQuery(GET_TEMPERATURE_BY_CITY_STATE);
    const [fetchHumidity, { data: humidData }] = useLazyQuery(GET_HUMIDITY_BY_CITY_STATE);
    const [fetchWindSpeed, { data: windData }] = useLazyQuery(GET_WIND_SPEED_BY_CITY_STATE);

    const calculateFill = (value, min, max) =>
    {
        /*
        given the us_state
        to fill, return
        the RGB value for this fill.
        */
        const ratio = max === min ? 0.5 : Math.min(Math.max((value - min) / (max - min), 0), 1);

        if (mode === "temperature") {
            // Blue (cold) → Red (hot)
            return interpolateColor(ratio, 0, 0, 255, 255, 0, 0);
        } 
        else if (mode === "humidity") {
            // Desert sand/gold brown (dry) → Green (humid)
            return interpolateColor(ratio, 218, 165, 32, 0, 200, 83);
        } 
        else if (mode === "wind_speed") {
            // Light Gray (calm) → Orange (intense)
            return interpolateColor(ratio, 255, 140, 0, 97, 23, 209);
        }
        return `#9f18dd`;
    }  


    // fetch data from the given mode
    useEffect(() => {
        
        /*
        can put the null-setting lines after fetchAllStates()
        to signify closing, but better up here before querying 50 
        things
        */
        setSelectedUSState(null);
        setCitiesData(null);
        
        /*get our averages, and fill the map*/
        const fetchAllStates = async () => {
            setLoading(true);
            const { query, resolverName, fieldName } = getQueryConfig();
            const stateEntries = Array.from(us_state_to_abbrev.entries());

            // fire all 50 state queries at the same time
            const results = await Promise.all(
                stateEntries.map(async ([state]) => {
                    const { data } = await client.query({ query, variables: { state } });
                    return { 
                        state, 
                        value: data?.[resolverName]?.[fieldName] ?? 0 
                    };
                })
            );

            const averages = {};
            results.forEach(({ state, value }) => {
                averages[state] = value;  // state is full name here
            });
            setStateAverages(averages);

            // find min/max across all states
            const vals = results.map(r => r.value);
            const min = Math.min(...vals);
            const max = Math.max(...vals);
            
            setMinVal(min);
            setMaxVal(max);

            // build the config object USAMap needs
            const config = {};
            results.forEach(({ state, value }) => {
                const abbrev = us_state_to_abbrev.get(state);
                config[abbrev] = { fill: calculateFill(value, min, max) };
            });

            setStatesCustomConfig(config);
            setLoading(false);
        };
        fetchAllStates();

    }, [mode, client]); // re-fetch whenever mode switches and event handlers for the map
    

    const handleClick = async (event) => {
        
        const stateName = event.target.dataset.name;  // state abbreviation
        const fullStateName = us_state_to_name[stateName]; // convert abbrev to full name


        if (selectedUSState && stateName === selectedUSState.name){
            setSelectedUSState(null);
            setCitiesData(null);
            return;
        }

    
        setSelectedUSState({
            name: event.target.dataset.name,
            x: event.clientX,
            y: event.clientY,
        });
        

        // get cities for this state from cities.yaml data
        const stateCities = cities_data[us_state_to_name.get(stateName)] || [];

        // quick Promise run to fetch
        // weather for each city in parallel
        const results = await Promise.all(
            stateCities.map(async (city) => {
                const { data } = await client.query({
                    query: mode === "temperature" ? GET_TEMPERATURE_BY_CITY_STATE
                        : mode === "humidity"    ? GET_HUMIDITY_BY_CITY_STATE
                        : GET_WIND_SPEED_BY_CITY_STATE,
                    variables: { city, state: us_state_to_name.get(stateName) }
                });

                const key = mode === "temperature" ? "getMostRecentTemperatureByCity"
                        : mode === "humidity"    ? "getMostRecentHumidityByCity"
                        : "getMostRecentWindSpeedByCity";

                const field = mode === "temperature" ? "temperature"
                            : mode === "humidity"    ? "humidity"
                            : "wind_speed";

                return {
                    city,
                    value: data?.[key]?.[field] ?? "N/A"
                };
            })
        );

        setCitiesData(results);

    };


    return (
        <div style={{ textAlign: "center", margin: "20px" }}>
            <h1>{full_name}</h1>
            <USAMap customize={statesCustomConfig} onClick={handleClick}/>
            <Legend mode={mode} min={minVal}
            max={maxVal} interpolateColor={interpolateColor}></Legend>
            {selectedUSState && (
                <USStateToolTip 
                    us_state={selectedUSState.name}
                    mode={mode}
                    city_vals={citiesData}
                    state_val = {stateAverages[us_state_to_name.get(selectedUSState.name)]}
                    loc={{ x: selectedUSState.x, y: selectedUSState.y }}
                    onClose={() => {setSelectedUSState(null); setCitiesData(null);}}
                />
            )}
        </div>
    );
};

export default CityColorMap;
