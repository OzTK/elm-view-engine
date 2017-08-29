module HasContextView exposing (view)

import Html exposing (Html, h1, div, text)
import Json.Encode
import Json.Decode exposing (decodeValue, string)
import Json.Decode.Pipeline exposing (decode, required)


-- Model


type alias SimpleContext =
    { simpleName : String }


simpleContext : Json.Encode.Value -> Result String SimpleContext
simpleContext =
    decode SimpleContext
        |> required "simpleName" string
        |> decodeValue



-- View


view : Json.Encode.Value -> Result String (Html ())
view jsonCtx =
    simpleContext jsonCtx
        |> Result.map .simpleName
        |> Result.map render


render : String -> Html ()
render username =
    div
        []
        [ h1 []
            [ text ("Hello " ++ username ++ "!")
            ]
        ]
