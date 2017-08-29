module Search exposing (Msg, view, search)

import Html exposing (Html, input)
import Html.Attributes exposing (type_, placeholder)
import Html.Events exposing (onInput)


type alias Model =
    { search : String }


search : String -> Model
search s =
    Model s


init : ( Model, Cmd msg )
init =
    { search = "" } ! []


type Msg
    = SearchChanged String
    | NoOp


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        SearchChanged s ->
            ( { model | search = s }, Cmd.none )

        NoOp ->
            ( model, Cmd.none )


view : Model -> Html Msg
view model =
    input
        [ onInput SearchChanged
        , type_ "text"
        , placeholder "Enter your search"
        ]
        []


main : Program Never Model Msg
main =
    Html.program
        { init = init
        , view = view
        , update = update
        , subscriptions = \_ -> Sub.none
        }
