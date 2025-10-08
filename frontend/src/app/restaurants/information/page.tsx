"use client";
import React from "react";
import RestaurantInformationCard from "@/components/restaurants/Details";
import {RestaurantsProvider} from "@/contexts/restaurants/RestaurantContext";
import Reviews from "@/components/restaurants/Reviews";


export default function RestaurantInformationPage() {
    return(
    <RestaurantsProvider>
        <RestaurantInformationCard />
        <Reviews />
    </RestaurantsProvider>);
}
