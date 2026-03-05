from pydantic import BaseModel, Field


class SessionCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)


class ChunkInitRequest(BaseModel):
    idx: int = Field(ge=0)
    mime_type: str = Field(min_length=1, max_length=200)


class ChunkUploadedRequest(BaseModel):
    duration_sec: float = Field(gt=0)


class NoteCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)


class NoteUpdateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    content: str = Field(max_length=200_000)
