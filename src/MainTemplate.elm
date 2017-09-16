port module Main exposing (..)

import HtmlToString exposing (htmlToString)
import Html exposing (Html, h1, div, text)
import Platform exposing (program)
import Dict exposing (Dict)
import Json.Encode
import Json.Decode exposing (decodeValue)
import Users
import Home
import Error


-- Ports


port getView : (GetViewRequest -> msg) -> Sub msg


port receiveHtml : GetHtmlResult -> Cmd msg



-- Model


type Msg
    = GetView GetViewRequest
    | NoOp


type alias Context =
    Json.Encode.Value


type alias GetViewRequest =
    { viewName : String, context : Context, id : Maybe Int }


type alias GetHtmlResult =
    { error : Maybe String, html : Maybe String, id : Maybe Int }


type alias Model =
    Dict String (Context -> Result String (Html ()))


init : ( Model, Cmd msg )
init =
    ( Dict.fromList
        [ ( "Home", map Home.view Home.context )
        , ( "Users", map Users.view Users.context )
        , ( "Error", map Error.view Error.context )
        ]
    , Cmd.none
    )



-- Update


update : Msg -> Model -> ( Model, Cmd msg )
update msg model =
    case msg of
        GetView request ->
            ( model
            , request.id
                |> getViewHtml model request.context request.viewName
                |> receiveHtml
            )

        NoOp ->
            model ! []



-- View


getViewHtml : Model -> Context -> String -> (Maybe Int -> GetHtmlResult)
getViewHtml views context name =
    String.split "." name
        |> List.reverse
        |> List.head
        |> Maybe.andThen (\n -> Dict.get n views)
        |> Maybe.map (renderView context)
        |> Maybe.withDefault (GetHtmlResult (Just <| "View was not found: " ++ name) Nothing)


renderView : Context -> (Context -> Result String (Html ())) -> (Maybe Int -> GetHtmlResult)
renderView context view =
    case view context of
        Ok view ->
            view
                |> htmlToString
                |> Just
                |> GetHtmlResult Nothing

        Err error ->
            GetHtmlResult (Just <| "Invalid context for this view: " ++ error) Nothing


map : (ctx -> Html msg) -> Json.Decode.Decoder ctx -> Context -> Result String (Html ())
map view ctx =
    decodeValue ctx >> Result.map view >> Result.map (Html.map <| always ())



-- Program


main : Program Never Model Msg
main =
    program
        { init = init
        , update = update
        , subscriptions = \_ -> getView GetView
        }
