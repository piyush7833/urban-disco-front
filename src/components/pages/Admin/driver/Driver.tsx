/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useEffect, useState } from "react";
import { PiPlusCircleBold } from "react-icons/pi";
import DialogBox from "@/components/common/DialogBox";
import useDriver from "@/app/hooks/useDriver";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import CommonCard from "@/components/common/CommonCard";
import LineBarGraph from "@/components/common/LineBarGraph";

type DriverType = {
  _id: string;
  name: string;
  licenseNumber: string;
  email: string;
  vehicle?: any;
};
const Driver = () => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const formFields = [
    { name: "name", type: "text", required: true },
    { name: "username", type: "text", required: true },
    { name: "phone", type: "phone", required: true },
    { name: "email", type: "email", required: true },
    { name: "password", type: "password", required: true },
    { name: "confirmPassword", type: "password" },
    { name: "licenseNumber", type: "text", required: true },
  ];
  const { drivers } = useSelector(
    (state: { driver: { drivers: DriverType[] } }) => state.driver
  );
  const [driverAnalytics, setDriverAnalytics] = useState<any[]>([]);
  const { addDriver, getDriver, deleteDriver, getAllDriverAnalytics } =
    useDriver();

  useEffect(() => {
    const fetchData = async () => {
      await getDriver();
      const res = await getAllDriverAnalytics();
      setDriverAnalytics(res?.data.data.driverAnalytics);
      console.log(res);
    };
    fetchData();
  }, []);
  const [formValues, setFormValues] = useState({});
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormValues({
      ...formValues,
      [name]: value,
    });
  };
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    addDriver(formValues);
    setIsOpen(false);
  };
  console.log(drivers, "Drivers");
  return (
    <div className="min-h-screen p-2">
      <div className="flex gap-2">
        <div className="flex w-2/3 flex-wrap gap-4 justify-center ">
          {drivers.length > 0 &&
            drivers.map((item: DriverType, index: any) => (
              <CommonCard
                key={index}
                title={item?.name}
                desc={`Email:- ${item?.email}`}
                secondaryText={item?.licenseNumber}
                primaryText={
                  item?.vehicle
                    ? "Vehicle :- " + item?.vehicle.model
                    : undefined
                }
                onDelete={() => {
                  deleteDriver(item?._id);
                }}
                onClick={() => {
                  router.push(`/admin/driver/${item._id}?name=${item.name}`);
                }}
                img="/images/driver.jpg"
                />
              ))}
        </div>
        <div className="w-1/3">
          <LineBarGraph
            graphData={driverAnalytics}
            valueKey="efficiency"
            XLabel="Email"
            YLabel="Efficiency"
            xValueKey="driver"
            isLine
            title="Top 5 efficient drivers"
          />
        </div>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-10 right-10 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition"
        >
          <PiPlusCircleBold className="h-6 w-6" />
        </button>

      {/* Custom Dialog for Adding Driver */}
      <DialogBox
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Add New Driver"
      >
        <form onSubmit={(e) => handleSubmit(e)}>
          {formFields.map((field) => (
            <div className="mb-4" key={field.name}>
              <label className="block mb-2 text-sm font-medium text-gray-600">
                {field.name.charAt(0).toUpperCase() + field.name.slice(1)}
              </label>
              {
                <input
                  type={field.type}
                  name={field.name}
                  required={field.required}
                  onChange={(e) => handleChange(e)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring focus:ring-blue-200"
                />
              }
            </div>
          ))}
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 mt-4 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none justify-end"
            >
              Add Driver
            </button>
          </div>
        </form>
      </DialogBox>
    </div>
  );
};

export default Driver;
