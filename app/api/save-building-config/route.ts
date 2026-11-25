import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { BuildingConfig } from '@/types/buildingEditor';

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Editing endpoints are disabled in production' }, { status: 403 });
  }
  try {
    const body = await req.json();
    const config: BuildingConfig = body.config;

    if (!config || typeof config.posX !== 'number' || typeof config.posZ !== 'number') {
      return NextResponse.json({ error: 'Invalid config payload' }, { status: 400 });
    }

    const projectRoot = process.cwd();

    // 1. Save config JSON snapshot to public/data/building_config.json
    const configJsonPath = path.join(projectRoot, 'public', 'data', 'building_config.json');
    fs.writeFileSync(configJsonPath, JSON.stringify(config, null, 2), 'utf-8');

    // 2. Update MainBuildingDetailed.tsx defaults
    const mainBuildingPath = path.join(projectRoot, 'components', 'canvas', 'MainBuildingDetailed.tsx');
    if (fs.existsSync(mainBuildingPath)) {
      let content = fs.readFileSync(mainBuildingPath, 'utf-8');

      // Update WORLD_X, WORLD_Z, ROT_Y
      content = content.replace(
        /const WORLD_X = [-\d.]+;/,
        `const WORLD_X = ${config.posX.toFixed(2)};`
      );
      content = content.replace(
        /const WORLD_Z = [-\d.]+;/,
        `const WORLD_Z = ${config.posZ.toFixed(2)};`
      );
      content = content.replace(
        /const ROT_Y = [-\d.]+;/,
        `const ROT_Y = ${config.rotY.toFixed(3)};`
      );

      fs.writeFileSync(mainBuildingPath, content, 'utf-8');
    }

    // 3. Update scripts/generate_blender_campus.py
    const blenderScriptPath = path.join(projectRoot, 'scripts', 'generate_blender_campus.py');
    if (fs.existsSync(blenderScriptPath)) {
      let pyContent = fs.readFileSync(blenderScriptPath, 'utf-8');
      pyContent = pyContent.replace(
        /MAIN_X = [-\d.]+/,
        `MAIN_X = ${config.posX.toFixed(2)}`
      );
      pyContent = pyContent.replace(
        /MAIN_Z = [-\d.]+/,
        `MAIN_Z = ${config.posZ.toFixed(2)}`
      );
      pyContent = pyContent.replace(
        /ROT_Y = [-\d.]+/,
        `ROT_Y = ${config.rotY.toFixed(3)}`
      );
      if (typeof config.wingAngle === 'number') {
        pyContent = pyContent.replace(
          /WING_ANGLE = [-\d.]+/,
          `WING_ANGLE = ${config.wingAngle.toFixed(3)}`
        );
      }
      fs.writeFileSync(blenderScriptPath, pyContent, 'utf-8');
    }

    return NextResponse.json({
      success: true,
      message: 'Building configuration successfully updated and saved to codebase!',
      config,
    });
  } catch (err) {
    console.error('Error saving building config:', err);
    return NextResponse.json(
      { error: 'Failed to save configuration' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const projectRoot = process.cwd();
    const configJsonPath = path.join(projectRoot, 'public', 'data', 'building_config.json');
    if (fs.existsSync(configJsonPath)) {
      const data = fs.readFileSync(configJsonPath, 'utf-8');
      return NextResponse.json(JSON.parse(data));
    }
    return NextResponse.json({ message: 'No custom config saved yet' });
  } catch {
    return NextResponse.json({ error: 'Failed to read configuration' }, { status: 500 });
  }
}
