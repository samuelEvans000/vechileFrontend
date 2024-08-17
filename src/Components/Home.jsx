import React, { useState, useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import axios from "axios";
import L from "leaflet";
import "./Home.css";
import { FaCarAlt, FaRegClock, FaRegSnowflake } from "react-icons/fa";
import { BsSpeedometer2 } from "react-icons/bs";
import {
  MdLocalGasStation,
  MdLock,
  MdNavigation,
  MdVpnKey,
} from "react-icons/md";
import { IoMdBatteryFull } from "react-icons/io";
import { FaLocationDot } from "react-icons/fa6";

const center = [17.385044, 78.486671];

const Home = () => {
  const [routeData, setRouteData] = useState([]);
  const [currentPosition, setCurrentPosition] = useState({
    coords: center,
    address: "",
    dateTime: "",
  });
  const [isMoving, setIsMoving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedRoute, setSelectedRoute] = useState("select");
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef(null);
  const [steps, setSteps] = useState(1);
  const [rotationAngle, setRotationAngle] = useState(0);
  const [isPopupVisible, setIsPopupVisible] = useState(true);
  const [isContainerVisible, setIsContainerVisible] = useState(false);
  const [isContainer1Visible, setIsContainer1Visible] = useState(true); // New state
  const markerRef = useRef(null);

  useEffect(() => {
    const storedRoute = localStorage.getItem("selectedRoute");
    if (storedRoute) {
      setSelectedRoute(storedRoute);
      handleRouteChange({ target: { value: storedRoute } }, true);
    } else {
      fetchData();
    }
  }, []);

  const fetchData = async () => {
    try {
      const response = await axios.get(
        "https://vehiclebackend-fvc2.onrender.com/api/vehicle"
      );
      const { defaultLocation, routeData } = response.data;
      setRouteData(routeData);
      updateCurrentPosition([
        defaultLocation.latitude,
        defaultLocation.longitude,
      ]);
      console.log("Fetched route data: ", routeData);
      console.log("Set current position: ", [
        defaultLocation.latitude,
        defaultLocation.longitude,
      ]);
    } catch (error) {
      console.error("Error fetching vehicle data:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateCurrentPosition = async (coords) => {
    const address = await fetchAddress(coords);
    const options = { hour: "2-digit", minute: "2-digit" };
    const time = new Date().toLocaleTimeString([], options);
    const dateOptions = { month: "short", day: "numeric" };
    const date = new Date().toLocaleDateString([], dateOptions);
    const dateTime = `${date}, ${time}`;
    setCurrentPosition({ coords, address, dateTime });
  };

  const fetchAddress = async (coords) => {
    const [latitude, longitude] = coords;
    try {
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
      );
      return response.data.display_name;
    } catch (error) {
      console.error("Error fetching address:", error);
      return "Address not available";
    }
  };

  const calculateBearing = (start, end) => {
    const startLat = (start[0] * Math.PI) / 180;
    const startLng = (start[1] * Math.PI) / 180;
    const endLat = (end[0] * Math.PI) / 180;
    const endLng = (end[1] * Math.PI) / 180;

    const dLng = endLng - startLng;
    const x = Math.sin(dLng) * Math.cos(endLat);
    const y =
      Math.cos(startLat) * Math.sin(endLat) -
      Math.sin(startLat) * Math.cos(endLat) * Math.cos(dLng);

    const bearing = (Math.atan2(x, y) * 180) / Math.PI;
    return (bearing + 360) % 360;
  };

  const TOLERANCE = 0.0001;

  useEffect(() => {
    if (isMoving && routeData.length > 1) {
      const moveVehicle = async () => {
        try {
          const currentIndex = routeData.findIndex(
            (point) =>
              Math.abs(point.latitude - currentPosition.coords[0]) <
                TOLERANCE &&
              Math.abs(point.longitude - currentPosition.coords[1]) < TOLERANCE
          );

          if (currentIndex === -1) {
            console.error("Current position not found in route data", {
              currentPosition: currentPosition.coords,
              routeData,
            });
            return;
          }

          const nextIndex = Math.min(
            currentIndex + steps,
            routeData.length - 1
          );
          if (nextIndex >= routeData.length || nextIndex < 0) {
            console.error("Next index is out of bounds");
            return;
          }

          const nextPosition = routeData[nextIndex];
          if (
            !nextPosition ||
            nextPosition.latitude === undefined ||
            nextPosition.longitude === undefined
          ) {
            console.error("Next position data is incomplete");
            return;
          }

          await updateCurrentPosition([
            nextPosition.latitude,
            nextPosition.longitude,
          ]);

          if (currentIndex < routeData.length - 1) {
            const previousPosition = routeData[currentIndex];
            const bearing = calculateBearing(
              [previousPosition.latitude, previousPosition.longitude],
              [nextPosition.latitude, nextPosition.longitude]
            );
            setRotationAngle(bearing);
          }

          console.log("Moved vehicle to: ", [
            nextPosition.latitude,
            nextPosition.longitude,
          ]);
          setProgress(((nextIndex + 1) / routeData.length) * 100);
        } catch (error) {
          console.error("Error in moveVehicle function:", error);
        }
      };

      intervalRef.current = setInterval(moveVehicle, 1000);
    } else {
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [isMoving, routeData, currentPosition, steps]);

  const handleRouteChange = async (e, initialLoad = false) => {
    const routeName = e.target.value;
    setSelectedRoute(routeName);
    if (!initialLoad) {
      localStorage.setItem("selectedRoute", routeName);
    }
    try {
      setLoading(true);
      await axios.post(
        "https://vehiclebackend-fvc2.onrender.com/api/select-route"
        , {
        routeName,
      });
      const response = await axios.get(
        "https://vehiclebackend-fvc2.onrender.com/api/vehicle"
      );
      const { defaultLocation, routeData } = response.data;
      setRouteData(routeData);
      updateCurrentPosition([
        defaultLocation.latitude,
        defaultLocation.longitude,
      ]);
      console.log("Route changed to: ", routeName);
      console.log("Fetched new route data: ", routeData);
      setProgress(0);
      setIsMoving(false);
    } catch (error) {
      console.error("Error updating route:", error);
    } finally {
      setLoading(false);
    }
  };

  const pathCoordinates = routeData.map((point) => [
    point.latitude,
    point.longitude,
  ]);

  const toggleMovement = () => {
    setIsMoving((prevState) => !prevState);
  };

  const restartMovement = () => {
    setIsMoving(false);
    updateCurrentPosition([routeData[0].latitude, routeData[0].longitude]);
    setProgress(0);
  };

  const getButtonImageSrc = () => {
    return isMoving ? "/assets/pause.png" : "/assets/play.png";
  };

  const statsData = [
    { label: "Total Distance", value: "834.89 km" },
    { label: "Distance From Last Stop", value: "0.00 km" },
    { label: "Today Running", value: "00h:00m" },
    { label: "Today Stopped", value: "00h:00m" },
    { label: "Today Idle", value: "00h:00m" },
    { label: "Current Status", value: "Stopped" },
    { label: "Today Max Speed", value: "834.89 km/h" },
    { label: "Today Ignition On", value: "00h:00m" },
    { label: "Today Ignition Off", value: "00h:00m" },
    { label: "Ignition Off Since", value: "00h:00m" },
    { label: "Today AC On", value: "00h:00m" },
    { label: "Today AC Off", value: "00h:00m" },
    { label: "AC off Since", value: "00h:00m" },
    { label: "Custom Value 1", value: "16%" },
  ];

  const handleWirelessClick = () => {
    setIsPopupVisible(true);
    if (markerRef.current) {
      markerRef.current.openPopup();
    }
  };

  const handleBackClick = () => {
    setIsContainer1Visible(true);
    setIsContainerVisible(false);
  };


  const createDirectionMarkers = () => {
    return routeData.slice(0, -1).map((point, index) => {
      const nextPoint = routeData[index + 1];
      const bearing = calculateBearing(
        [point.latitude, point.longitude],
        [nextPoint.latitude, nextPoint.longitude]
      );
      return (
        <Marker
          key={index}
          position={[point.latitude, point.longitude]}
          icon={
            new L.divIcon({
              className: "direction-icon",
              html: `<img src="/assets/navigator.png" style="transform: rotate(${bearing}deg); width: 10px; height: 10px;" />`,
              iconSize: [10, 10],
            })
          }
        />
      );
    });
  };


  return (
    <div className="mapContainer">
      {loading ? (
        <div>Loading...</div>
      ) : (
        <>
          <MapContainer
            center={currentPosition.coords}
            zoom={15}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            {routeData.length > 0 && (
              <>
                <Marker
                  position={currentPosition.coords}
                  icon={
                    new L.divIcon({
                      className: "car",
                      html: `<img src="/assets/car.png" style="transform: rotate(${rotationAngle}deg);" />`,
                      iconSize: [40, 40],
                    })
                  }
                  ref={markerRef}
                >
                  {isPopupVisible && (
                    <Popup>
                      <div className="wireless">
                        <div className="row1">
                          <div className="row1c">
                            <div className="carIcon">
                              <FaCarAlt color="white" />
                            </div>{" "}
                            WIRELESS
                          </div>
                          <div className="row1cg">
                            <FaRegClock color="green" />{" "}
                            {currentPosition.dateTime}
                          </div>
                        </div>

                        <div className="row2">
                          <div className="location">
                            <FaLocationDot color="#08c083" />
                          </div>
                          <span className="sliding-text">
                            {currentPosition.address}
                          </span>
                        </div>

                        <div className="row3">
                          <div className="row3a">
                            <div className="row3ac">
                              <BsSpeedometer2 size={20} />
                              <h5>0.00km/h</h5>
                              <p>Speed</p>
                            </div>
                            <div className="row3ac">
                              <MdNavigation size={20} color="#6c25f0" />
                              <h5>0.00km</h5>
                              <p>Distance</p>
                            </div>
                            <div className="row3ac">
                              <IoMdBatteryFull size={20} color="#25f0c4" />
                              <h5>16%</h5>
                              <p>Battery</p>
                            </div>
                          </div>

                          <div className="row3b">
                            {statsData.map((stat, index) => (
                              <div key={index} className="row3bc">
                                <h5>{stat.value}</h5>
                                <p>{stat.label}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="row4">
                          <div className="row4c">
                            <MdVpnKey color="#d84f4f" size={15} />
                          </div>
                          <div className="row4c">
                            <IoMdBatteryFull color="#d84f4f" size={15} />
                          </div>
                          <div className="row4c">
                            <FaRegSnowflake color="#d84f4f" size={15} />
                          </div>
                          <div className="row4c">
                            <MdLocalGasStation color="#d84f4f" size={15} />
                          </div>
                          <div className="row4c">
                            <MdLock color="#d84f4f" size={15} />
                          </div>
                        </div>
                      </div>
                    </Popup>
                  )}
                </Marker>
                <Polyline positions={pathCoordinates} color="green" />
                {createDirectionMarkers()}
              </>
            )}
          </MapContainer>

          {isContainer1Visible && !isContainerVisible && (
            <div className="container1">
              <button className="wirelessbtn" onClick={handleWirelessClick}>
                Wireless
              </button>
              <select value={selectedRoute} onChange={handleRouteChange}>
                <option value="select">Today</option>
                <option value="Route 1">Yesterday</option>
                <option value="Route 2">This Week</option>
                <option value="Route 3">Previous Week</option>
              </select>
              <button
                className="showbtn"
                onClick={() => {
                  if (selectedRoute !== "select") {
                    setIsContainer1Visible(false);
                    setIsContainerVisible(true);
                  }
                }}
              >
                Show
              </button>
            </div>
          )}

          {isContainerVisible && (
            <div className="container2">
              <button className="back" onClick={handleBackClick}>
                <img src="/assets/back.png" />
              </button>
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
                    backgroundColor: "rgb(62, 117, 189)",
                    transition: "width 1s ease",
                  }}
                />
              </div>
              <button className="start" onClick={toggleMovement}>
                <img src={getButtonImageSrc()} alt="Toggle Movement" />
              </button>
              <button className="stop" onClick={restartMovement}>
                <img src="/assets/restart.png" alt="Restart" />
              </button>
              <input
                type="range"
                min="1"
                max="5"
                value={steps}
                onChange={(e) => setSteps(Number(e.target.value))}
                className="stepSlider"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Home;
