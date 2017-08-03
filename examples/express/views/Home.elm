module Home exposing (view)

import Html exposing (Html, h1, div, text)
import Json.Encode
import Json.Decode exposing (decodeValue, string)
import Json.Decode.Pipeline exposing (decode, required)


-- Model


type alias TitleContext =
    { title : String }


titleContext : Json.Encode.Value -> Result String TitleContext
titleContext =
    decode TitleContext
        |> required "title" string
        |> decodeValue



-- View


view : msg -> Json.Encode.Value -> Result String (Html msg)
view msg jsonCtx =
    titleContext jsonCtx
        |> Result.map render


render : TitleContext -> Html msg
render ctx =
    div
        []
        [ h1 []
            [ text ("Hello " ++ ctx.title ++ "!")
            ]
        ]
