import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import axios from "axios";
import L from "leaflet";
import "./App.css";

const center = [17.385044, 78.486671];

// Custom icon for the vehicle
const vehicleIcon = new L.Icon({
  iconUrl: "/assets/vechile.png",
  iconSize: [40, 40],
});

const App = () => {
  const [routeData, setRouteData] = useState([]);
  const [currentPosition, setCurrentPosition] = useState(center);
  const [isMoving, setIsMoving] = useState(false);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get("http://localhost:3001/api/vehicle");
        const { defaultLocation, routeData } = response.data;
        setRouteData(routeData);
        setCurrentPosition([
          defaultLocation.latitude,
          defaultLocation.longitude,
        ]);
      } catch (error) {
        console.error("Error fetching vehicle data:", error);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (isMoving && routeData.length > 1) {
      const moveVehicle = () => {
        const currentIndex = routeData.findIndex(
          (point) =>
            point.latitude === currentPosition[0] &&
            point.longitude === currentPosition[1]
        );
        if (currentIndex < routeData.length - 1) {
          const nextIndex = currentIndex + 1;
          setCurrentPosition([
            routeData[nextIndex].latitude,
            routeData[nextIndex].longitude,
          ]);
          setProgress(((nextIndex + 1) / routeData.length) * 100);
        } else {
          clearInterval(intervalRef.current);
        }
      };
      intervalRef.current = setInterval(moveVehicle, 1000);
    } else {
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [isMoving, routeData, currentPosition]);

  const pathCoordinates = routeData.map((point) => [
    point.latitude,
    point.longitude,
  ]);


  const toggleMovement = () =>{
    setIsMoving(prevState => !prevState);
  }

  const restartMovement = () => {
    setIsMoving(false);
    setCurrentPosition(center);
    setProgress(0);
};

  const getButtonImageSrc = () => {
    return isMoving ? "/assets/pause.png" : "/assets/play.png";
  };


  return (
    <div className="mapContainer">
      <MapContainer
        center={currentPosition}
        zoom={15}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {routeData.length > 0 && (
          <Marker position={currentPosition} icon={vehicleIcon} />
        )}
        <Polyline positions={pathCoordinates} color="red" />
      </MapContainer>
      <div className="container">
        <button className="start" onClick={toggleMovement}><img src={getButtonImageSrc()} /></button>
        <button className="stop" onClick={restartMovement}><img src="/assets/restart.png " /></button>
        <div
          style={{
            zIndex: 1000,
            width: "300px",
            height: "5px",
            backgroundColor: "#e0e0e0",
            borderRadius: "10px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: "100%",
              backgroundColor: " rgb(62, 117, 189)",
              transition: "width 1s ease",
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default App;
