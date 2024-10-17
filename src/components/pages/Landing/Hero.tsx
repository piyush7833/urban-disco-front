"use client";

import { useContext, useEffect, useRef, useState } from "react";
import { MapContainer, Marker, TileLayer, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";
import L from "leaflet";
import "leaflet-routing-machine";
import Button from "@/components/common/Button";
import usePrice from "@/app/hooks/usePrice";
import { vehicles } from "../../../../config/constantMaps";
import useLocation from "@/app/hooks/useLocation";
import { formatTime } from "@/utils/utils";
import { SocketContext } from "@/providers/socketProvider";
import HeroStepper from "./HeroStepper";
import useBooking from "@/app/hooks/useBooking";
import Search from "./Search";
import Vehicles from "./Vehicles";
import DriverCard from "./DriverCard";
import AnimatedModal from "@/components/common/AnimatedModal";

interface LatLng {
  lat: number;
  lng: number;
}

interface vehicleData {
  type: string;
  desc: string;
  img: string;
  price: number | null;
  time: string | null;
}
interface propsType {
  isDriver: boolean;
  bookingDatac:any,
  setBookingDatac:any
}
const Hero = ({ isDriver,bookingDatac,setBookingDatac }: propsType) => {
  const [locationA, setLocationA] = useState<LatLng | null>(null);
  const [locationB, setLocationB] = useState<LatLng | null>(null);
  const [currentPositionB, setCurrentPositionB] = useState<LatLng | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<LatLng[]>([]);
  const [vehicleData, setVehicleData] = useState<vehicleData[]>(vehicles);
  const [inputValueA, setInputValueA] = useState<string>("");
  const [inputValueB, setInputValueB] = useState<string>("");
  const [distance, setDistance] = useState<number>(0);
  const [traffic, setTraffic] = useState<string>("");
  const [bookingPrice, setBookingPrice] = useState<number | null>(null);
  const [isPayemntButton, setIsPayementButton] = useState(false);
  const [driverId, setDriverId] = useState("");
  const [currentStatus, setCurrentStatus] = useState("");
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [drivers, setDrivers] = useState([]);
  const [alertModalOpen,setAlertModalOpen]=useState(false)
  const [modalmessage,setModalMessage]=useState("")

  const { getPrices } = usePrice();
  const { getRouteDetails, isRaining } = useLocation();
  const { handlePayment } = useBooking();

  const { socket, locationSocket } = useContext(SocketContext);
  const customMarkerIcon = new L.Icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  });
  const truckIcon = new L.Icon({
    iconUrl: "/images/truck.png", // Replace with your truck SVG path
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  useEffect(() => {
    if (mapRef.current && locationA && locationB) {
      const map = mapRef.current;
      const waypoints = currentPositionB
        ? [
            L.latLng(locationB.lat, locationB.lng),
            L.latLng(currentPositionB.lat, currentPositionB.lng),
          ]
        : [
            L.latLng(locationA.lat, locationA.lng),
            L.latLng(locationB.lat, locationB.lng),
          ];

      map.eachLayer((layer) => {
        if (layer instanceof L.Routing.Control) {
          try {
            if (map != null) {
              map.removeLayer(layer);
            }
          } catch (error) {
            console.error("Error removing layer:", error);
          }
        }
      });

      const routingControl = L.Routing.control({
        waypoints,
        routeWhileDragging: true,
        createMarker: () => null,
      }).addTo(map);

      routingControl.on("routesfound", (e: L.Routing.RoutingResultEvent) => {
        const bounds = L.latLngBounds(e.routes[0].coordinates);
        map.fitBounds(bounds);

        const coords = e.routes[0].coordinates.map((coord) => ({
          lat: coord.lat,
          lng: coord.lng,
        }));
        setRouteCoordinates(coords);
      });

      return () => {
        map.removeControl(routingControl);
      };
    }
  }, [locationA, locationB, currentPositionB]);

  useEffect(() => {
    if (currentPositionB && mapRef.current) {
      const map = mapRef.current;
      map.flyTo([currentPositionB.lat, currentPositionB.lng], 13, {
        duration: 2,
      });
    }
  }, [currentPositionB]);

  // Follow currentPositionB as it moves
  useEffect(() => {
    if (currentPositionB && mapRef.current) {
      const map = mapRef.current;
      map.panTo([currentPositionB.lat, currentPositionB.lng], {
        animate: true,
        duration: 1,
      });
    }
  }, [currentPositionB]);

  useEffect(() => {
    if (currentPositionB) {
      // Zoom to the location of Marker B
      mapRef.current?.setView([currentPositionB.lat, currentPositionB.lng], 15);
    }
  }, [currentPositionB]);

  useEffect(() => {
    if (locationA && locationB) {
      getRouteDetails(locationA, locationB).then((data) => {
        if (data) {
          setDistance(data.distance);
          setTraffic(data.traffic);
          setVehicleData((prevVehicleData) =>
            prevVehicleData.map((vehicle) => ({
              ...vehicle,
              time: formatTime(data.time),
            }))
          );
        }
      });
    }
  }, [locationA, locationB]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (locationSocket && driverId && bookingDatac) {
        if (bookingDatac && bookingDatac && bookingDatac._id) {
          locationSocket.emit("updateBookedDriverLocation", {
            driverId,
            bookingId: bookingDatac._id,
            locationB,
          });
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [locationSocket, driverId, bookingDatac?._id]);

  // Listen for bookingCollected event
  useEffect(() => {
    if (socket) {
      socket.on("bookingCollected", ({ booking }) => {
        if (bookingDatac && booking._id === bookingDatac._id) {
          if(!isDriver){
            setAlertModalOpen(true)
            setModalMessage("Item has been collected")
          }
          setCurrentStatus("collected");
          setLocationB({
            lat: booking.destn.coordinates[1],
            lng: booking.destn.coordinates[0],
          });
          console.log(
            booking.destn.coordinates[0],
            booking.destn.coordinates[1],
            "booking"
          );
        }
      });

      // Clean up the socket listener
      return () => {
        socket.off("bookingCollected");
      };
    }
  }, [socket, bookingDatac]);

  const handleGetPrice = () => {
    if (locationA && locationB) {
      isRaining(locationA.lat, locationA.lng).then((res) => {
        getPrices(distance, traffic, res as boolean).then((res) => {
          setVehicleData((prevVehicleData) =>
            prevVehicleData.map((vehicle) => ({
              ...vehicle,
              price: res?.data?.data?.price[vehicle.type] || vehicle.price,
            }))
          );
        });
      });
    }
  };

  const Payment = async () => {
    try {
      await handlePayment(bookingPrice, bookingDatac._id);
      setBookingDatac(null);
      setBookingPrice(null);
      setIsPayementButton(false);
    } catch (error) {
      console.log(error);
    }
  };
  // Listen for booking acceptance
  if (socket) {
    socket.on("bookingAccepted", ({ booking, driverName, driverId }) => {
      if (bookingDatac && booking._id === bookingDatac._id) {
        if(!isDriver){
          setAlertModalOpen(true)
          setModalMessage( `${driverName} has accepted your booking`)
        }
        if(isDriver){
          setLocationB(booking.src);
        }
        setBookingDatac(booking);
        setDriverId(driverId);
        setLocationB(locationA);
        setDrivers([]);
        setCurrentStatus("accepted");
        setIsBookingOpen(true);
      }
    });
    socket.on("bookingNotAccepted", ({ booking }) => {
      if (bookingDatac && booking._id === bookingDatac._id) {
        if(!isDriver){
          setAlertModalOpen(true)
          setModalMessage("No driver accepted your booking")
        }
        setBookingDatac(null);
        setBookingPrice(null);
        setIsBookingOpen(false);
        setDrivers([]);
      }
    });
    socket.on("bookingCancelled", ({ booking }) => {
      if (bookingDatac && booking._id === bookingDatac._id) {
        if(!isDriver){
          setAlertModalOpen(true)
          setModalMessage("Booking has been cancelled")
        }
        setBookingDatac(null);
        setBookingPrice(null);
        setDriverId("");
        setCurrentStatus("cancelled");
        setLocationA(null);
        setLocationB(null);
        setIsBookingOpen(false);
        setCurrentPositionB(null);
      }
    });
    socket.on("bookingCompleted", ({ booking }) => {
      if (bookingDatac && booking._id === bookingDatac._id) {
        if(!isDriver){
          setAlertModalOpen(true)
          setModalMessage("Item has been delivered")
        }
        setIsPayementButton(true);
        setDriverId("");
        setCurrentStatus("completed");
        setIsBookingOpen(false);
      }
    });
  }

  if (locationSocket) {
    locationSocket.on("driverLocationUpdate", ({ location, bookingIds }) => {
      if (bookingIds == bookingDatac?._id) {
        // console.log(location,"location")
        setCurrentPositionB(location);
      }
    });
  }

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-8vh)]">
      <AnimatedModal
        message={modalmessage}
        isVisible={alertModalOpen}
        onClose={()=>setAlertModalOpen(false)}
      />

      {!isDriver && !isBookingOpen && (
        <div className="md:w-1/3 w-full p-4 bg-gray-100 relative z-20 flex flex-col justify-between">
          <Search
            inputValueA={inputValueA}
            inputValueB={inputValueB}
            setInputValueA={setInputValueA}
            setInputValueB={setInputValueB}
            setLocationA={setLocationA}
            setLocationB={setLocationB}
            mapRef={mapRef}
          />
          {drivers.length > 0 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold text-gray-800 text-center">Nearby Drivers</h2>
              <h2 className="text-base font-semibold text-gray-800 text-center">Someone will pick your booking request soon</h2>
              {drivers.length>0 && drivers.map((driver:any, index) => (
                <DriverCard
                  key={index}
                  driverName={driver.user.name}
                  distance={`${driver.distance} km`}
                />
              ))}
            </div>
          )}
          {drivers.length===0 && <Vehicles
            locationA={locationA}
            locationB={locationB}
            distance={distance}
            bookingDatac={bookingDatac}
            inputValueA={inputValueA}
            inputValueB={inputValueB}
            vehicleData={vehicleData}
            setBookingData={setBookingDatac}
            setBookingPrice={setBookingPrice}
            setDrivers={setDrivers}
          />}

          {!isPayemntButton && (
            <Button
              text="Get Price"
              onClick={() => {
                handleGetPrice();
              }}
              disabled={locationA == null || locationB == null || distance == 0}
            />
          )}
          {isPayemntButton && (
            <Button
              text={`Pay ${bookingPrice}`}
              onClick={() => {
                Payment();
              }}
            />
          )}
        </div>
      )}
      <HeroStepper
        isDriver={isDriver}
        setBookingDatac={setBookingDatac}
        bookingDatac={bookingDatac}
        currentStatus={currentStatus}
        setCurrentStatus={setCurrentStatus}
        isBookingOpen={isBookingOpen}
        setIsBookingOpen={setIsBookingOpen}
      />
      <div className="md:w-2/3 w-full h-full relative">
        <MapContainer
          center={[28.7175691552515, 77.23654986073308]}
          zoom={13}
          scrollWheelZoom={true}
          style={{ height: "100%", width: "100%" }}
          ref={(mapInstance) => {
            mapRef.current = mapInstance ? mapInstance : null;
          }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          {locationA && !currentPositionB && (
            <Marker
              position={[locationA.lat, locationA.lng]}
              icon={customMarkerIcon}
            />
          )}
          {locationB && (
            <Marker
              position={[locationB.lat, locationB.lng]}
              icon={customMarkerIcon}
            />
          )}
          {currentPositionB && (
            <Marker
              position={[currentPositionB.lat, currentPositionB.lng]}
              icon={truckIcon}
            />
          )}
          {routeCoordinates.length > 0 && (
            <Polyline positions={routeCoordinates} color="blue" />
          )}
        </MapContainer>
      </div>
    </div>
  );
};

export default Hero;
