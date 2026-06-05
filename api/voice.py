import boto3

def speech(userText: str) -> bytes:
    """Convert text to MP3 audio bytes using AWS Polly."""
    client = boto3.client('polly', region_name='us-east-1')

    # SSML로 볼륨 +6dB 부스트
    ssml_text = f'<speak><prosody volume="+6dB">{userText}</prosody></speak>'

    response = client.synthesize_speech(
        Text=ssml_text,
        TextType='ssml',
        OutputFormat='mp3',
        VoiceId='Seoyeon',   # 영어 여성 음성. 한국어면 'Seoyeon' 사용
        Engine='neural',
    )

    return response['AudioStream'].read()
