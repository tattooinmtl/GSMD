export type DataCenterId = 'earthscope' | 'canada' | 'ncedc' | 'scedc';

export interface DataCenter {
  id: DataCenterId;
  label: string;
  stationUrl: string;
  dataselectUrl: string;
  networks: Record<string, string>;
}

export const DATA_CENTERS: Record<DataCenterId, DataCenter> = {
  earthscope: {
    id: 'earthscope',
    label: 'EarthScope',
    stationUrl: 'https://service.earthscope.org/fdsnws/station/1/query',
    dataselectUrl: 'https://service.earthscope.org/fdsnws/dataselect/1/query',
    networks: { IU: 'USGS Global', II: 'IRIS / IDA', IC: 'IRIS / Cariaco', G: 'GEOSCOPE', US: 'US National', AK: 'Alaska' },
  },
  canada: {
    id: 'canada',
    label: 'Earthquakes Canada',
    stationUrl: 'https://www.earthquakescanada.nrcan.gc.ca/fdsnws/station/1/query',
    dataselectUrl: 'https://www.earthquakescanada.nrcan.gc.ca/fdsnws/dataselect/1/query',
    networks: { CN: 'Canadian National' },
  },
  ncedc: {
    id: 'ncedc',
    label: 'NCEDC',
    stationUrl: 'https://service.ncedc.org/fdsnws/station/1/query',
    dataselectUrl: 'https://service.ncedc.org/fdsnws/dataselect/1/query',
    networks: { NC: 'N. California', BK: 'Berkeley', NN: 'Nevada' },
  },
  scedc: {
    id: 'scedc',
    label: 'SCEDC',
    stationUrl: 'https://service.scedc.caltech.edu/fdsnws/station/1/query',
    dataselectUrl: 'https://service.scedc.caltech.edu/fdsnws/dataselect/1/query',
    networks: { CI: 'S. California', AZ: 'Arizona' },
  },
};

export const CHANNEL_PRIORITY = ['BHZ', 'HHZ', 'EHZ', 'SHZ', 'LHZ', 'BH1', 'BH2'];

export function centerList(): DataCenter[] {
  return Object.values(DATA_CENTERS);
}
