module Views.Error exposing (view, context)

import Html exposing (Html, h1, h2, h3, div, text)
import Html.Attributes exposing (style)
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


context : Json.Decode.Decoder ErrorContext
context =
    decode ErrorContext
        |> optional "message" string ""
        |> required "error" error



-- View


view : ErrorContext -> Html Never
view ctx =
    div
        []
        [ h1 [ style [ ( "color", "red" ) ] ] [ text ("Error " ++ ctx.error.code ++ " " ++ toString ctx.error.status) ]
        , h2 [] [ text ctx.message ]
        , h3 [] [ text ctx.error.stack ]
        ]
