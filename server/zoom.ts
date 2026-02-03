import axios from 'axios';

interface ZoomTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface ZoomMeetingResponse {
  id: number;
  uuid: string;
  topic: string;
  start_url: string;
  join_url: string;
  password: string;
  duration: number;
  status: string;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getZoomAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const accountId = process.env.ZOOM_ACCOUNT_ID;
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;

  if (!accountId || !clientId || !clientSecret) {
    throw new Error('Zoom API kalitlari topilmadi. ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID va ZOOM_CLIENT_SECRET sozlang.');
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  try {
    const response = await axios.post<ZoomTokenResponse>(
      'https://zoom.us/oauth/token',
      new URLSearchParams({
        grant_type: 'account_credentials',
        account_id: accountId,
      }),
      {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    cachedToken = {
      token: response.data.access_token,
      expiresAt: Date.now() + (response.data.expires_in - 60) * 1000,
    };

    return response.data.access_token;
  } catch (error: any) {
    console.error('Zoom token olishda xato:', error.response?.data || error.message);
    throw new Error('Zoom bilan ulanishda xato. API kalitlarini tekshiring.');
  }
}

export async function createZoomMeeting(
  topic: string,
  duration: number = 60
): Promise<{ meetingId: string; joinUrl: string; startUrl: string; password: string }> {
  const accessToken = await getZoomAccessToken();

  try {
    const response = await axios.post<ZoomMeetingResponse>(
      'https://api.zoom.us/v2/users/me/meetings',
      {
        topic,
        type: 2,
        duration,
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: false,
          mute_upon_entry: true,
          waiting_room: false,
          audio: 'both',
          auto_recording: 'none',
        },
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      meetingId: response.data.id.toString(),
      joinUrl: response.data.join_url,
      startUrl: response.data.start_url,
      password: response.data.password,
    };
  } catch (error: any) {
    console.error('Zoom uchrashuv yaratishda xato:', error.response?.data || error.message);
    throw new Error('Zoom uchrashuv yaratib bo\'lmadi. Qaytadan urinib ko\'ring.');
  }
}

export async function endZoomMeeting(meetingId: string): Promise<void> {
  const accessToken = await getZoomAccessToken();

  try {
    await axios.put(
      `https://api.zoom.us/v2/meetings/${meetingId}/status`,
      { action: 'end' },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Zoom uchrashuvni tugatishda xato:', error.response?.data || error.message);
  }
}

export async function deleteZoomMeeting(meetingId: string): Promise<void> {
  const accessToken = await getZoomAccessToken();

  try {
    await axios.delete(
      `https://api.zoom.us/v2/meetings/${meetingId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );
  } catch (error: any) {
    console.error('Zoom uchrashuvni o\'chirishda xato:', error.response?.data || error.message);
  }
}

export function isZoomConfigured(): boolean {
  return !!(
    process.env.ZOOM_ACCOUNT_ID &&
    process.env.ZOOM_CLIENT_ID &&
    process.env.ZOOM_CLIENT_SECRET
  );
}
