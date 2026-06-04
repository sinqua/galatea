import boto3

def speech(userText: str) -> bytes:
    """Convert text to MP3 audio bytes using AWS Polly."""
    client = boto3.client('polly', region_name='us-east-1')

    response = client.synthesize_speech(
        Text=userText,
        OutputFormat='mp3',
        VoiceId='Joanna',   # 영어 여성 음성. 한국어면 'Seoyeon' 사용
        Engine='neural',
    )

    return response['AudioStream'].read()
