import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IHistoricalData extends Document {
  device_id: string;
  water_level: number;
  air_humidity: number;
  temperature: number;
  timestamp: Date;
}

const HistoricalDataSchema: Schema = new Schema({
  device_id: { type: String, required: true },
  water_level: { type: Number },
  air_humidity: { type: Number },
  temperature: { type: Number }, // เพิ่มอุณหภูมิ
  timestamp: { type: Date, default: Date.now }
});

const HistoricalData: Model<IHistoricalData> = mongoose.models.HistoricalData || mongoose.model<IHistoricalData>('HistoricalData', HistoricalDataSchema);
export default HistoricalData;