import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { apiKey } = await request.json();

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 400 }
      );
    }

    // Hacer una llamada simple a la API de Gemini para validar la clave
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + apiKey, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      return NextResponse.json({ valid: true });
    } else {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Error validating API key:', error);
    return NextResponse.json(
      { error: 'Failed to validate API key' },
      { status: 500 }
    );
  }
}