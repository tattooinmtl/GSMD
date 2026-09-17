export type GibsPeriod = 'daily' | 'monthly' | 'static';

export interface GibsSpec {
  id: string;
  ext: 'png' | 'jpg';
  maxZoom: number;
  period: GibsPeriod;
}

export const GIBS_BY_LAYER: Record<string, GibsSpec> = {
  clouds: { id: 'MODIS_Terra_Cloud_Fraction_Day', ext: 'png', maxZoom: 6, period: 'daily' },
  precipitation: { id: 'IMERG_Precipitation_Rate', ext: 'png', maxZoom: 6, period: 'daily' },
  temperature: { id: 'MODIS_Terra_Land_Surface_Temp_Day', ext: 'png', maxZoom: 7, period: 'daily' },
  sst: { id: 'GHRSST_L4_MUR_Sea_Surface_Temperature', ext: 'png', maxZoom: 7, period: 'daily' },
  so2: { id: 'OMI_SO2_Planetary_Boundary_Layer', ext: 'png', maxZoom: 6, period: 'daily' },
  aerosol: { id: 'MODIS_Combined_Value_Added_AOD', ext: 'png', maxZoom: 6, period: 'daily' },
  pm25: { id: 'MODIS_Terra_Aerosol', ext: 'png', maxZoom: 6, period: 'daily' },
  co: { id: 'MOPITT_CO_Monthly_Total_Column_Day', ext: 'png', maxZoom: 6, period: 'monthly' },
  methane: { id: 'AIRS_L3_Methane_400hPa_Volume_Mixing_Ratio_Daily_Day', ext: 'png', maxZoom: 6, period: 'daily' },
  ozone: { id: 'OMPS_Ozone_Total_Column', ext: 'png', maxZoom: 6, period: 'daily' },
  humidity: { id: 'AIRS_L3_Surface_Relative_Humidity_Daily_Day', ext: 'png', maxZoom: 6, period: 'daily' },
  chlorophyll: { id: 'VIIRS_SNPP_L2_Chlorophyll_A', ext: 'png', maxZoom: 7, period: 'daily' },
  currents: { id: 'OSCAR_Sea_Surface_Currents_Final', ext: 'png', maxZoom: 5, period: 'daily' },
  sea_level: { id: 'Sea_Level_Rise', ext: 'png', maxZoom: 5, period: 'static' },
  ndvi: { id: 'MODIS_Terra_L3_NDVI_Monthly', ext: 'png', maxZoom: 7, period: 'monthly' },
  night_lights: { id: 'VIIRS_Night_Lights', ext: 'png', maxZoom: 6, period: 'static' },
  soil_moisture: { id: 'SMAP_L4_Analyzed_Root_Zone_Soil_Moisture', ext: 'png', maxZoom: 6, period: 'daily' },
  sea_ice: { id: 'MODIS_Terra_Sea_Ice', ext: 'png', maxZoom: 7, period: 'daily' },
  co2: { id: 'OCO-2_Carbon_Dioxide_Total_Column_Average', ext: 'png', maxZoom: 6, period: 'monthly' },
  nox: { id: 'OMI_Nitrogen_Dioxide_Tropo_Column', ext: 'png', maxZoom: 6, period: 'daily' },
  wind: { id: 'AMSRUE_Ocean_Wind_Speed_Day', ext: 'png', maxZoom: 6, period: 'daily' },
};
