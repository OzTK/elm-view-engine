module HasContextView exposing (view, context)

import Html exposing (Html, h1, div, text)
import Json.Decode exposing (Decoder, decodeValue, string)
import Json.Decode.Pipeline exposing (decode, required)


-- Model


type alias SimpleContext =
    { simpleName : String }


context : Decoder SimpleContext
context =
    decode SimpleContext
        |> required "simpleName" string



-- View


view : SimpleContext -> Html Never
view =
    .simpleName >> render


render : String -> Html Never
render username =
    div
        []
        [ h1 []
            [ text ("Hello " ++ username ++ "!")
            ]
        ]
