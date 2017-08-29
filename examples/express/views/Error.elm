module Error exposing (view)

import Html exposing (Html, h1, h2, h3, div, text)
import Html.Attributes exposing (style)
import Json.Encode
import Json.Decode exposing (decodeValue, string, int)
import Json.Decode.Pipeline exposing (decode, optional, required)


-- Model


type alias Error =
    { code : String, status : Int, stack : String, message : String }


type alias ErrorContext =
    { message : String, error : Error }


error : Json.Decode.Decoder Error
error =
    decode Error
        |> optional "code" string ""
        |> optional "status" int 500
        |> optional "stack" string ""
        |> optional "message" string ""


errorContext : Json.Encode.Value -> Result String ErrorContext
errorContext =
    decode ErrorContext
        |> optional "message" string ""
        |> required "error" error
        |> decodeValue



-- View


view : Json.Encode.Value -> Result String (Html Never)
view jsonCtx =
    case errorContext jsonCtx of
        Ok ctx ->
            Ok <| render ctx

        Err err ->
            Ok <| h3 [] [ text err ]


render : ErrorContext -> Html Never
render ctx =
    div
        []
        [ h1 [ style [ ( "color", "red" ) ] ] [ text ("Error " ++ ctx.error.code ++ " " ++ toString ctx.error.status) ]
        , h2 [] [ text ctx.message ]
        , h3 [] [ text ctx.error.stack ]
        ]
