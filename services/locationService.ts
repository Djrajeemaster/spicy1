import * as Location from 'expo-location';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

export interface LocationData {
  coordinates: LocationCoordinates;
  city?: string;
  state?: string;
  country?: string;
  address?: string;
}

class LocationService {
  private currentLocation: LocationData | null = null;

  /**
   * Requests location permissions from the user.
   */
  async requestLocationPermission(): Promise<{ granted: boolean; error?: string }> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        return { 
          granted: false, 
          error: 'Location permission denied. Please enable location access in your device settings.' 
        };
      }

      return { granted: true };
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return { 
        granted: false, 
        error: 'Failed to request location permission.' 
      };
    }
  }

  /**
   * Gets the user's current location.
   */
  async getCurrentLocation(): Promise<{ data: LocationData | null; error?: string }> {
    try {
      const { granted, error } = await this.requestLocationPermission();
      
      if (!granted) {
        return { data: null, error };
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const coordinates: LocationCoordinates = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      // Get reverse geocoding for address details
      const reverseGeocode = await Location.reverseGeocodeAsync(coordinates);
      const address = reverseGeocode[0];

      const locationData: LocationData = {
        coordinates,
        city: address?.city || undefined,
        state: address?.region || undefined,
        country: address?.country || undefined,
        address: [address?.street, address?.streetNumber].filter(Boolean).join(' ') || undefined,
      };

      this.currentLocation = locationData;
      return { data: locationData };
    } catch (error) {
      console.error('Error getting current location:', error);
      return { 
        data: null, 
        error: 'Failed to get your current location. Please check your location settings.' 
      };
    }
  }

  /**
   * Calculates the distance between two coordinates in miles.
   */
  calculateDistance(
    coord1: LocationCoordinates,
    coord2: LocationCoordinates
  ): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRadians(coord2.latitude - coord1.latitude);
    const dLon = this.toRadians(coord2.longitude - coord1.longitude);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(coord1.latitude)) * 
      Math.cos(this.toRadians(coord2.latitude)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return Math.round(distance * 10) / 10; // Round to 1 decimal place
  }

  /**
   * Filters deals by proximity to user's location.
   */
  async filterDealsByProximity(
    deals: any[],
    radiusMiles: number = 5
  ): Promise<{ data: any[]; error?: string }> {
    try {
      if (!this.currentLocation) {
        const { data: locationData, error } = await this.getCurrentLocation();
        if (error || !locationData) {
          return { data: deals, error };
        }
      }

      const filteredDeals = deals.map(deal => {
        // For now, we'll use mock coordinates for deals since they're not in the DB
        // In a real implementation, you'd store lat/lng in the deals table
        const dealCoords = this.getMockDealCoordinates(deal.city);
        const distance = this.calculateDistance(
          this.currentLocation!.coordinates,
          dealCoords
        );

        return {
          ...deal,
          distance: `${distance} miles`,
          distanceValue: distance,
        };
      }).filter(deal => deal.distanceValue <= radiusMiles)
        .sort((a, b) => a.distanceValue - b.distanceValue);

      return { data: filteredDeals };
    } catch (error) {
      console.error('Error filtering deals by proximity:', error);
      return { 
        data: deals, 
        error: 'Failed to filter deals by location.' 
      };
    }
  }

  /**
   * Mock function to get coordinates for a city.
   * In a real implementation, you'd either store coordinates in the deals table
   * or use a geocoding service to convert city names to coordinates.
   */
  private getMockDealCoordinates(city: string): LocationCoordinates {
    const cityCoords: { [key: string]: LocationCoordinates } = {
      'New York': { latitude: 40.7128, longitude: -74.0060 },
      'Los Angeles': { latitude: 34.0522, longitude: -118.2437 },
      'Chicago': { latitude: 41.8781, longitude: -87.6298 },
      'Houston': { latitude: 29.7604, longitude: -95.3698 },
      'Phoenix': { latitude: 33.4484, longitude: -112.0740 },
      'Philadelphia': { latitude: 39.9526, longitude: -75.1652 },
      'San Antonio': { latitude: 29.4241, longitude: -98.4936 },
      'San Diego': { latitude: 32.7157, longitude: -117.1611 },
      'Dallas': { latitude: 32.7767, longitude: -96.7970 },
      'San Jose': { latitude: 37.3382, longitude: -121.8863 },
    };

    return cityCoords[city] || { latitude: 40.7128, longitude: -74.0060 }; // Default to NYC
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Gets the cached current location without making a new request.
   */
  getCachedLocation(): LocationData | null {
    return this.currentLocation;
  }
}

export const locationService = new LocationService();