import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Building } from '@/types/campus';
import { BuildingConfig } from '@/types/buildingEditor';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const buildings: Building[] = body.buildings;
    const config: BuildingConfig | undefined = body.config;

    if (!Array.isArray(buildings)) {
      return NextResponse.json({ error: 'Invalid payload: buildings must be an array' }, { status: 400 });
    }

    const projectRoot = process.cwd();

    // 1. Save custom buildings array to public/data/campus_buildings_custom.json
    const customBuildingsPath = path.join(projectRoot, 'public', 'data', 'campus_buildings_custom.json');
    fs.writeFileSync(customBuildingsPath, JSON.stringify(buildings, null, 2), 'utf-8');

    // 2. Update public/data/sit_campus_processed.json so all routes and initial loads get updated data
    const campusJsonPath = path.join(projectRoot, 'public', 'data', 'sit_campus_processed.json');
    if (fs.existsSync(campusJsonPath)) {
      try {
        const campusData = JSON.parse(fs.readFileSync(campusJsonPath, 'utf-8'));
        campusData.buildings = buildings;
        fs.writeFileSync(campusJsonPath, JSON.stringify(campusData, null, 2), 'utf-8');
      } catch (err) {
        console.error('Failed to update sit_campus_processed.json:', err);
      }
    }

    // 3. If config is provided, also update building_config.json
    if (config) {
      const configJsonPath = path.join(projectRoot, 'public', 'data', 'building_config.json');
      fs.writeFileSync(configJsonPath, JSON.stringify(config, null, 2), 'utf-8');
    }

    return NextResponse.json({
      success: true,
      message: 'All campus buildings successfully saved and persisted!',
      count: buildings.length,
    });
  } catch (err: any) {
    console.error('Error saving campus buildings:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to save campus buildings' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const projectRoot = process.cwd();
    const customBuildingsPath = path.join(projectRoot, 'public', 'data', 'campus_buildings_custom.json');
    if (fs.existsSync(customBuildingsPath)) {
      const data = fs.readFileSync(customBuildingsPath, 'utf-8');
      return NextResponse.json({
        success: true,
        buildings: JSON.parse(data),
      });
    }
    return NextResponse.json({ success: false, message: 'No custom buildings saved yet' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
